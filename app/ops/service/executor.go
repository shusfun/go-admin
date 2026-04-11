package service

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	log "github.com/go-admin-team/go-admin-core/logger"
	"golang.org/x/sync/singleflight"
	"gorm.io/gorm"

	appModels "go-admin/app/ops/models"
	"go-admin/app/ops/service/dto"
	cfg "go-admin/config"
)

const (
	maxTaskLogBytes  = 1024 * 1024
	healthRetries    = 10
	healthInterval   = 3 * time.Second
	healthTimeout    = 3 * time.Second
	logFlushInterval = 500 * time.Millisecond
	repoCacheTTL     = 60 * time.Second
	repoFetchTimeout = 30 * time.Second
)

var httpClient = &http.Client{Timeout: healthTimeout}

var repoPendingCache = struct {
	mu    sync.RWMutex
	items map[string]repoPendingCacheEntry
}{
	items: make(map[string]repoPendingCacheEntry),
}

var repoPendingGroup singleflight.Group

type repoPendingCacheEntry struct {
	value     dto.RepoPendingCommits
	updatedAt time.Time
}

type taskStep struct {
	Name       string
	Suggestion string
	Run        func(context.Context) error
}

type statusEvent struct {
	Status     string `json:"status"`
	Step       int    `json:"step"`
	TotalSteps int    `json:"totalSteps"`
	StepName   string `json:"stepName"`
}

type logEvent struct {
	Line   string `json:"line"`
	Offset int    `json:"offset"`
}

type doneEvent struct {
	Status   string `json:"status"`
	Summary  string `json:"summary"`
	Duration string `json:"duration"`
	Domain   string `json:"domain"`
}

type errorEvent struct {
	Status     string `json:"status"`
	Step       int    `json:"step"`
	StepName   string `json:"stepName"`
	ErrMsg     string `json:"errMsg"`
	Suggestion string `json:"suggestion"`
}

type TaskRunner struct {
	db           *gorm.DB
	taskID       int
	env          cfg.OpsEnvironment
	task         *appModels.OpsTask
	logMu        sync.Mutex
	logDirty     bool
	flushStop    chan struct{}
	flushDone    chan struct{}
	started      time.Time
	fetchedRepos map[string]struct{}
}

func FindEnvironment(environments []cfg.OpsEnvironment, key string) (cfg.OpsEnvironment, error) {
	for _, env := range environments {
		if env.Key == key {
			return env, nil
		}
	}
	return cfg.OpsEnvironment{}, errors.New("环境不存在或未启用")
}

func ValidateTaskRequest(req *dto.CreateTaskReq, env cfg.OpsEnvironment) error {
	switch req.Type {
	case appModels.TaskTypeDeployBackend, appModels.TaskTypeDeployFrontend, appModels.TaskTypeDeployAll, appModels.TaskTypeRestart:
	default:
		return errors.New("不支持的任务类型")
	}
	if env.ConfirmName && req.ConfirmName != env.Key {
		return errors.New("请输入环境名称确认")
	}
	return nil
}

func BuildEnvironmentItems(db *gorm.DB, environments []cfg.OpsEnvironment) ([]dto.EnvironmentItem, error) {
	items := make([]dto.EnvironmentItem, len(environments))
	var wg sync.WaitGroup
	errCh := make(chan error, len(environments))

	for index, env := range environments {
		wg.Add(1)
		go func(index int, env cfg.OpsEnvironment) {
			defer wg.Done()

			item := dto.EnvironmentItem{
				Key:         env.Key,
				Name:        env.Name,
				Enabled:     env.Enabled,
				Domain:      env.Domain,
				ConfirmName: env.ConfirmName,
				Status:      "disabled",
				Actions: []string{
					appModels.TaskTypeDeployBackend,
					appModels.TaskTypeDeployFrontend,
					appModels.TaskTypeDeployAll,
					appModels.TaskTypeRestart,
				},
			}
			if env.Enabled {
				item.Status = "healthy"
				if env.Backend.HealthURL != "" && !isHealthy(env.Backend.HealthURL) {
					item.Status = "unhealthy"
				}
				item.PendingCommits.Backend = safeGetPendingCommits(env.Backend.RepoDir)
				item.PendingCommits.Frontend = safeGetPendingCommits(env.Frontend.RepoDir)
			}

			lastTask := &appModels.OpsTask{}
			if err := db.Model(&appModels.OpsTask{}).
				Where("env = ?", env.Key).
				Where("status IN ?", []string{appModels.TaskStatusSuccess, appModels.TaskStatusFailed, appModels.TaskStatusCancelled}).
				Order("finished_at DESC, id DESC").
				First(lastTask).Error; err == nil {
				item.LastDeploy = &dto.LastDeploy{
					Id:         lastTask.Id,
					Type:       lastTask.Type,
					Status:     lastTask.Status,
					FinishedAt: formatTime(lastTask.FinishedAt),
				}
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				errCh <- err
				return
			}

			runningTask := &appModels.OpsTask{}
			if err := db.Model(&appModels.OpsTask{}).
				Where("env = ?", env.Key).
				Where("status IN ?", []string{appModels.TaskStatusQueued, appModels.TaskStatusRunning}).
				Order("id DESC").
				First(runningTask).Error; err == nil {
				item.RunningTask = &dto.RunningTask{
					Id:         runningTask.Id,
					Type:       runningTask.Type,
					Status:     runningTask.Status,
					Step:       runningTask.Step,
					TotalSteps: runningTask.TotalSteps,
					StepName:   runningTask.StepName,
				}
			} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				errCh <- err
				return
			}

			items[index] = item
		}(index, env)
	}

	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			return nil, err
		}
	}
	return items, nil
}

func StreamTask(c *gin.Context, db *gorm.DB, task *appModels.OpsTask, lastOffset int) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.Status(http.StatusInternalServerError)
		return
	}
	sendEvent := func(name string, data interface{}) {
		c.SSEvent(name, data)
		flusher.Flush()
	}
	sendStatusSnapshot(sendEvent, task)
	sendLogSnapshot(sendEvent, task.Log, lastOffset)
	domain := ""
	if env, err := FindEnvironment(cfg.ExtConfig.Ops.Environments, task.Env); err == nil {
		domain = env.Domain
	}
	if isFinalStatus(task.Status) {
		sendFinalEvent(sendEvent, task, domain)
		return
	}
	ch := GetTaskManager().Subscribe(task.Id)
	defer GetTaskManager().Unsubscribe(task.Id, ch)
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case event, ok := <-ch:
			if !ok {
				refreshed := &appModels.OpsTask{}
				if err := db.First(refreshed, task.Id).Error; err == nil {
					sendFinalEvent(sendEvent, refreshed, domain)
				}
				return
			}
			sendEvent(event.Type, event.Data)
			if event.Type == "done" || event.Type == "error" {
				return
			}
		case <-ticker.C:
			_, _ = c.Writer.WriteString(":heartbeat\n\n")
			flusher.Flush()
		case <-c.Request.Context().Done():
			return
		}
	}
}

func StartTaskAsync(db *gorm.DB, taskID int, env cfg.OpsEnvironment) {
	GetTaskManager().StartTask(taskID, func(ctx context.Context) {
		(&TaskRunner{
			db:           db,
			taskID:       taskID,
			env:          env,
			fetchedRepos: make(map[string]struct{}),
		}).Run(ctx)
	})
}

func (r *TaskRunner) Run(ctx context.Context) {
	defer GetTaskManager().UnlockEnv(r.env.Key, r.taskID)
	defer GetTaskManager().Close(r.taskID)

	task := &appModels.OpsTask{}
	if err := r.db.First(task, r.taskID).Error; err != nil {
		return
	}
	r.task = task
	if isFinalStatus(task.Status) {
		return
	}
	timeoutCtx, cancel := context.WithTimeout(ctx, resolveTaskTimeout(task.Type, r.env))
	defer cancel()
	r.startLogFlusher()
	defer r.stopLogFlusher()
	if err := timeoutCtx.Err(); err != nil {
		r.cancelTask("等待执行", "任务已取消，请确认环境状态后重试", err)
		return
	}
	r.started = time.Now()
	startedAt := r.started
	r.updateTask(map[string]interface{}{
		"status":     appModels.TaskStatusRunning,
		"started_at": &startedAt,
		"summary":    "任务执行中",
	})
	r.broadcastStatus()

	commits, err := r.collectCommits()
	if err != nil {
		r.failTask("准备提交信息", "请检查仓库状态和上游分支配置", err)
		return
	}
	if len(commits.Backend) > 0 || len(commits.Frontend) > 0 {
		raw, marshalErr := json.Marshal(commits)
		if marshalErr != nil {
			r.failTask("准备提交信息", "请检查提交信息序列化逻辑", marshalErr)
			return
		}
		r.updateTask(map[string]interface{}{"commits": string(raw)})
	}

	steps, err := r.buildSteps()
	if err != nil {
		r.failTask("准备任务步骤", "请检查运维环境配置", err)
		return
	}
	r.updateTask(map[string]interface{}{"total_steps": len(steps)})
	r.broadcastStatus()

	for index, step := range steps {
		r.updateTask(map[string]interface{}{
			"step":      index + 1,
			"step_name": step.Name,
		})
		r.broadcastStatus()
		if err = step.Run(timeoutCtx); err != nil {
			switch {
			case errors.Is(err, context.Canceled):
				r.cancelTask(step.Name, "任务已取消，请确认环境状态后重试", err)
			case errors.Is(err, context.DeadlineExceeded):
				r.timeoutTask(step.Name, "任务执行超时，请检查环境状态或调大超时配置")
			default:
				r.failTask(step.Name, step.Suggestion, err)
			}
			return
		}
	}
	r.succeedTask()
}

func (r *TaskRunner) buildSteps() ([]taskStep, error) {
	switch r.task.Type {
	case appModels.TaskTypeDeployBackend:
		return r.backendSteps(false), nil
	case appModels.TaskTypeDeployFrontend:
		return r.frontendSteps(), nil
	case appModels.TaskTypeDeployAll:
		steps := r.backendSteps(false)
		return append(steps, r.frontendSteps()...), nil
	case appModels.TaskTypeRestart:
		return r.backendSteps(true), nil
	default:
		return nil, errors.New("不支持的任务类型")
	}
}

func (r *TaskRunner) backendSteps(restartOnly bool) []taskStep {
	repoDir := r.env.Backend.RepoDir
	composeFile := getComposeFile(r.env)
	serviceName := r.env.Backend.ServiceName
	steps := make([]taskStep, 0, 4)
	if restartOnly {
		steps = append(steps, taskStep{
			Name:       "重启服务",
			Suggestion: "请检查 Docker、Compose 配置以及服务启动日志",
			Run: func(ctx context.Context) error {
				r.appendLog("[info] 重启后端服务，服务启动阶段会按配置自动执行幂等迁移检查")
				return r.runCmd(ctx, repoDir, nil, "docker", "compose", "-f", composeFile, "restart", serviceName)
			},
		})
	} else {
		steps = append(steps,
			taskStep{
				Name:       "拉取代码",
				Suggestion: "请检查 Git 仓库状态和网络连接",
				Run: func(ctx context.Context) error {
					if err := ensureGitDeployReady(ctx, repoDir, r.hasFetchedRepo(repoDir)); err != nil {
						return err
					}
					if err := r.runCmd(ctx, repoDir, nil, "git", "pull", "--ff-only"); err != nil {
						return err
					}
					invalidateRepoPendingCache(repoDir)
					return nil
				},
			},
			taskStep{
				Name:       "构建镜像",
				Suggestion: "请检查代码修复编译问题后重试",
				Run: func(ctx context.Context) error {
					return r.runCmd(ctx, repoDir, nil, "docker", "compose", "-f", composeFile, "build", serviceName)
				},
			},
			taskStep{
				Name:       "重启服务",
				Suggestion: "请检查 Docker、Compose 配置以及服务启动日志",
				Run: func(ctx context.Context) error {
					r.appendLog("[info] 重启后端服务，服务启动阶段会按配置自动执行幂等迁移检查")
					return r.runCmd(ctx, repoDir, nil, "docker", "compose", "-f", composeFile, "up", "-d", serviceName)
				},
			},
		)
	}
	steps = append(steps, taskStep{
		Name:       "健康检查",
		Suggestion: "服务启动失败，请检查容器日志，确认是否为启动迁移、配置或应用初始化失败",
		Run: func(ctx context.Context) error {
			return waitForHealth(ctx, r.env.Backend.HealthURL, r.appendLog)
		},
	})
	return steps
}

func (r *TaskRunner) frontendSteps() []taskStep {
	repoDir := r.env.Frontend.RepoDir
	distDir := getDistDir(r.env)
	publishDir := r.env.Frontend.PublishDir
	return []taskStep{
		{
			Name:       "拉取代码",
			Suggestion: "请检查前端仓库状态、pnpm 锁文件和 Vite 配置",
			Run: func(ctx context.Context) error {
				if err := ensureFrontendProject(repoDir); err != nil {
					return err
				}
				if err := ensureGitDeployReady(ctx, repoDir, r.hasFetchedRepo(repoDir)); err != nil {
					return err
				}
				if err := r.runCmd(ctx, repoDir, nil, "git", "pull", "--ff-only"); err != nil {
					return err
				}
				invalidateRepoPendingCache(repoDir)
				return nil
			},
		},
		{
			Name:       "安装依赖",
			Suggestion: "请检查 pnpm 和依赖锁文件",
			Run: func(ctx context.Context) error {
				return r.runCmd(ctx, repoDir, nil, "pnpm", "install", "--frozen-lockfile")
			},
		},
		{
			Name:       "构建项目",
			Suggestion: "请检查代码修复构建问题后重试",
			Run: func(ctx context.Context) error {
				return r.runCmd(ctx, repoDir, map[string]string{"NODE_OPTIONS": "--max-old-space-size=1024"}, "pnpm", "build")
			},
		},
		{
			Name:       "同步文件",
			Suggestion: "请检查静态目录权限和构建产物",
			Run: func(ctx context.Context) error {
				srcDir := filepath.Join(repoDir, distDir)
				return syncDir(srcDir, publishDir)
			},
		},
		{
			Name:       "重载 Nginx",
			Suggestion: "请检查 Nginx 配置",
			Run: func(ctx context.Context) error {
				if !r.env.Frontend.ReloadNginx {
					r.appendLog("[skip] 未开启 Nginx reload")
					return nil
				}
				return r.runCmd(ctx, repoDir, nil, "nginx", "-s", "reload")
			},
		},
	}
}

func (r *TaskRunner) collectCommits() (dto.TaskCommits, error) {
	commits := dto.TaskCommits{}
	var err error
	switch r.task.Type {
	case appModels.TaskTypeDeployBackend, appModels.TaskTypeDeployAll:
		commits.Backend, err = getRepoAllCommits(r.env.Backend.RepoDir)
		if err != nil {
			return commits, err
		}
		r.markRepoFetched(r.env.Backend.RepoDir)
	}
	switch r.task.Type {
	case appModels.TaskTypeDeployFrontend, appModels.TaskTypeDeployAll:
		commits.Frontend, err = getRepoAllCommits(r.env.Frontend.RepoDir)
		if err != nil {
			return commits, err
		}
		r.markRepoFetched(r.env.Frontend.RepoDir)
	}
	return commits, nil
}

func (r *TaskRunner) runCmd(ctx context.Context, dir string, env map[string]string, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	cmd.Env = os.Environ()
	for k, v := range env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}
	r.appendLog(fmt.Sprintf("> %s %s", name, strings.Join(args, " ")))
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}
	if err = cmd.Start(); err != nil {
		return err
	}
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		r.scanPipe(stdout)
	}()
	go func() {
		defer wg.Done()
		r.scanPipe(stderr)
	}()
	wg.Wait()
	if err = cmd.Wait(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	return nil
}

func (r *TaskRunner) scanPipe(reader io.Reader) {
	scanner := bufio.NewScanner(reader)
	buf := make([]byte, 0, 1024)
	scanner.Buffer(buf, 1024*1024)
	for scanner.Scan() {
		r.appendLog(scanner.Text())
	}
}

func (r *TaskRunner) appendLog(line string) {
	if line == "" {
		return
	}
	if r.task == nil {
		return
	}
	if !strings.HasSuffix(line, "\n") {
		line += "\n"
	}
	r.logMu.Lock()
	r.task.Log = limitLogSize(r.task.Log + line)
	r.logDirty = true
	offset := utf8.RuneCountInString(r.task.Log)
	r.logMu.Unlock()
	GetTaskManager().Broadcast(r.taskID, TaskEvent{
		Type: "log",
		Data: logEvent{
			Line:   line,
			Offset: offset,
		},
	})
}

func (r *TaskRunner) updateTask(updates map[string]interface{}) {
	if len(updates) == 0 {
		return
	}
	_ = r.db.Model(&appModels.OpsTask{}).Where("id = ?", r.taskID).Updates(updates).Error
	applyTaskUpdates(r.task, updates)
}

func (r *TaskRunner) broadcastStatus() {
	GetTaskManager().Broadcast(r.taskID, TaskEvent{
		Type: "status",
		Data: statusEvent{
			Status:     r.task.Status,
			Step:       r.task.Step,
			TotalSteps: r.task.TotalSteps,
			StepName:   r.task.StepName,
		},
	})
}

func sanitizeTaskErrorMessage(stepName string, err error) string {
	if err == nil {
		if stepName == "" {
			return "任务未完成"
		}
		return stepName + "未完成"
	}

	raw := strings.TrimSpace(err.Error())
	if raw == "" {
		return sanitizeTaskErrorMessage(stepName, nil)
	}

	switch {
	case strings.Contains(raw, "健康检查未通过"):
		return "服务发布后校验未通过"
	case strings.Contains(raw, "仓库未配置上游分支"):
		return "代码仓库同步信息不完整，请先检查仓库配置"
	case strings.Contains(raw, "仓库存在未提交变更"):
		return "部署目录存在未提交变更，请先清理后再发布"
	case strings.Contains(raw, "前端项目缺少必需文件"), strings.Contains(raw, "vite.config"):
		return "前端构建配置不完整，请检查项目文件"
	case strings.Contains(raw, "同步目录配置不完整"):
		return "部署目录配置不完整，请检查环境设置"
	case strings.Contains(raw, "构建产物目录不存在"):
		return "构建产物未找到，请先确认构建结果"
	case strings.Contains(raw, "目标目录不安全"):
		return "部署目标目录配置无效，请检查环境设置"
	case strings.Contains(raw, "\n"), strings.Contains(raw, "\r"), strings.Contains(strings.ToLower(raw), "dial tcp"), strings.Contains(strings.ToLower(raw), "panic"), strings.Contains(strings.ToLower(raw), "permission denied"):
		if stepName == "" {
			return "任务未完成，请稍后重试"
		}
		return stepName + "未完成，请稍后重试"
	default:
		return raw
	}
}

func (r *TaskRunner) failTask(stepName, suggestion string, err error) {
	r.stopLogFlusher()
	now := time.Now()
	errMsg := sanitizeTaskErrorMessage(stepName, err)
	r.updateTask(map[string]interface{}{
		"status":      appModels.TaskStatusFailed,
		"step_name":   stepName,
		"summary":     "任务执行失败",
		"err_msg":     errMsg,
		"suggestion":  suggestion,
		"finished_at": &now,
	})
	GetTaskManager().Broadcast(r.taskID, TaskEvent{
		Type: "error",
		Data: errorEvent{
			Status:     r.task.Status,
			Step:       r.task.Step,
			StepName:   r.task.StepName,
			ErrMsg:     errMsg,
			Suggestion: suggestion,
		},
	})
}

func (r *TaskRunner) succeedTask() {
	r.stopLogFlusher()
	now := time.Now()
	r.updateTask(map[string]interface{}{
		"status":      appModels.TaskStatusSuccess,
		"summary":     successSummaryByTaskType(r.task.Type),
		"finished_at": &now,
	})
	GetTaskManager().Broadcast(r.taskID, TaskEvent{
		Type: "done",
		Data: doneEvent{
			Status:   r.task.Status,
			Summary:  r.task.Summary,
			Duration: time.Since(r.started).Round(time.Second).String(),
			Domain:   r.env.Domain,
		},
	})
}

func successSummaryByTaskType(taskType string) string {
	switch taskType {
	case appModels.TaskTypeDeployBackend:
		return "后端更新完成"
	case appModels.TaskTypeDeployFrontend:
		return "前端更新完成"
	case appModels.TaskTypeDeployAll:
		return "代码更新完成"
	case appModels.TaskTypeRestart:
		return "后端重启完成"
	default:
		return "任务执行完成"
	}
}

func (r *TaskRunner) cancelTask(stepName, suggestion string, err error) {
	r.stopLogFlusher()
	now := time.Now()
	errMsg := "任务已取消"
	if err != nil {
		errMsg = errMsg + "：" + sanitizeTaskErrorMessage(stepName, err)
	}
	r.updateTask(map[string]interface{}{
		"status":      appModels.TaskStatusCancelled,
		"step_name":   stepName,
		"summary":     "任务已取消",
		"err_msg":     errMsg,
		"suggestion":  suggestion,
		"finished_at": &now,
	})
	broadcastTaskError(r.taskID, r.task)
}

func (r *TaskRunner) timeoutTask(stepName, suggestion string) {
	r.stopLogFlusher()
	now := time.Now()
	errMsg := "任务执行超时"
	r.updateTask(map[string]interface{}{
		"status":      appModels.TaskStatusFailed,
		"step_name":   stepName,
		"summary":     "任务执行超时",
		"err_msg":     errMsg,
		"suggestion":  suggestion,
		"finished_at": &now,
	})
	broadcastTaskError(r.taskID, r.task)
}

func (r *TaskRunner) startLogFlusher() {
	if r.flushStop != nil {
		return
	}
	r.flushStop = make(chan struct{})
	r.flushDone = make(chan struct{})
	go func() {
		defer close(r.flushDone)
		ticker := time.NewTicker(logFlushInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				r.flushLogs(false)
			case <-r.flushStop:
				r.flushLogs(true)
				return
			}
		}
	}()
}

func (r *TaskRunner) stopLogFlusher() {
	if r.flushStop == nil {
		return
	}
	close(r.flushStop)
	<-r.flushDone
	r.flushLogs(true)
	r.flushStop = nil
	r.flushDone = nil
}

func (r *TaskRunner) flushLogs(force bool) {
	if r.task == nil {
		return
	}
	for {
		r.logMu.Lock()
		if !force && !r.logDirty {
			r.logMu.Unlock()
			return
		}
		logContent := r.task.Log
		r.logDirty = false
		r.logMu.Unlock()

		_ = r.db.Model(&appModels.OpsTask{}).Where("id = ?", r.taskID).Update("log", logContent).Error

		if !force {
			return
		}
		r.logMu.Lock()
		stable := !r.logDirty && r.task.Log == logContent
		r.logMu.Unlock()
		if stable {
			return
		}
	}
}

func (r *TaskRunner) markRepoFetched(repoDir string) {
	if repoDir == "" {
		return
	}
	r.fetchedRepos[filepath.Clean(repoDir)] = struct{}{}
}

func (r *TaskRunner) hasFetchedRepo(repoDir string) bool {
	if repoDir == "" {
		return false
	}
	_, ok := r.fetchedRepos[filepath.Clean(repoDir)]
	return ok
}

func safeGetPendingCommits(repoDir string) dto.RepoPendingCommits {
	pending, err := getRepoPendingCommits(repoDir)
	if err != nil {
		log.Warnf("ops pending commits skipped for %s: %v", repoDir, err)
		return dto.RepoPendingCommits{}
	}
	return pending
}

func getRepoAllCommits(repoDir string) ([]dto.CommitInfo, error) {
	pending, err := getRepoPendingCommits(repoDir)
	if err != nil {
		return nil, err
	}
	return pending.Commits, nil
}

func getRepoPendingCommits(repoDir string) (dto.RepoPendingCommits, error) {
	if repoDir == "" {
		return dto.RepoPendingCommits{}, nil
	}
	if err := ensureRepoDir(repoDir); err != nil {
		return dto.RepoPendingCommits{}, err
	}

	cleanRepoDir := filepath.Clean(repoDir)
	if cached, ok := loadRepoPendingCache(cleanRepoDir); ok {
		return cached, nil
	}

	value, err, _ := repoPendingGroup.Do(cleanRepoDir, func() (interface{}, error) {
		if cached, ok := loadRepoPendingCache(cleanRepoDir); ok {
			return cached, nil
		}
		ctx, cancel := context.WithTimeout(context.Background(), repoFetchTimeout)
		defer cancel()
		if _, err := runOutputCommand(ctx, cleanRepoDir, "git", "fetch", "--prune"); err != nil {
			return dto.RepoPendingCommits{}, err
		}
		pending, err := loadRepoPendingCommits(ctx, cleanRepoDir)
		if err != nil {
			return dto.RepoPendingCommits{}, err
		}
		storeRepoPendingCache(cleanRepoDir, pending)
		return pending, nil
	})
	if err != nil {
		return dto.RepoPendingCommits{}, err
	}
	return value.(dto.RepoPendingCommits), nil
}

func getUpstreamBranch(ctx context.Context, repoDir string) (string, error) {
	output, err := runOutputCommand(ctx, repoDir, "git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
	if err != nil {
		return "", errors.New("仓库未配置上游分支")
	}
	return strings.TrimSpace(output), nil
}

func ensureCleanWorktree(ctx context.Context, repoDir string) error {
	output, err := runOutputCommand(ctx, repoDir, "git", "status", "--porcelain")
	if err != nil {
		return err
	}
	if strings.TrimSpace(output) != "" {
		return errors.New("仓库存在未提交变更，禁止发布")
	}
	return nil
}

func ensureGitDeployReady(ctx context.Context, repoDir string, skipFetch bool) error {
	if err := ensureRepoDir(repoDir); err != nil {
		return err
	}
	if !skipFetch {
		if _, err := runOutputCommand(ctx, repoDir, "git", "fetch", "--prune"); err != nil {
			return err
		}
	}
	if _, err := getUpstreamBranch(ctx, repoDir); err != nil {
		return err
	}
	return ensureCleanWorktree(ctx, repoDir)
}

func ensureRepoDir(repoDir string) error {
	if repoDir == "" {
		return errors.New("仓库目录未配置")
	}
	info, err := os.Stat(repoDir)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return errors.New("仓库目录不存在")
	}
	return nil
}

func ensureFrontendProject(repoDir string) error {
	if err := ensureRepoDir(repoDir); err != nil {
		return err
	}
	requiredFiles := []string{
		filepath.Join(repoDir, "package.json"),
		filepath.Join(repoDir, "pnpm-lock.yaml"),
	}
	for _, file := range requiredFiles {
		if _, err := os.Stat(file); err != nil {
			return fmt.Errorf("前端项目缺少必需文件: %s", filepath.Base(file))
		}
	}
	matches, err := filepath.Glob(filepath.Join(repoDir, "vite.config.*"))
	if err != nil || len(matches) == 0 {
		return errors.New("前端项目缺少 vite.config.* 配置")
	}
	return nil
}

func getComposeFile(env cfg.OpsEnvironment) string {
	composeFile := env.Backend.ComposeFile
	if composeFile == "" {
		composeFile = "docker-compose.yml"
	}
	if filepath.IsAbs(composeFile) {
		return composeFile
	}
	if env.Backend.RepoDir == "" {
		return filepath.Clean(composeFile)
	}
	return filepath.Join(env.Backend.RepoDir, composeFile)
}

func getDistDir(env cfg.OpsEnvironment) string {
	if env.Frontend.DistDir != "" {
		return env.Frontend.DistDir
	}
	return "dist"
}

func waitForHealth(ctx context.Context, url string, logf func(string)) error {
	if url == "" {
		return errors.New("健康检查地址未配置")
	}
	var lastErr error
	for i := 0; i < healthRetries; i++ {
		ok, status, err := checkHealth(ctx, url)
		if ok {
			if logf != nil {
				logf(fmt.Sprintf("[健康检查] 服务已就绪 (%s)", status))
			}
			return nil
		}
		if err != nil {
			lastErr = err
		} else {
			lastErr = fmt.Errorf("健康检查未通过: %s", status)
		}
		if logf != nil {
			logf(fmt.Sprintf("[健康检查] 第 %d/%d 次重试失败: %v", i+1, healthRetries, lastErr))
		}
		if i == healthRetries-1 {
			break
		}
		select {
		case <-time.After(healthInterval):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	return lastErr
}

func isHealthy(url string) bool {
	if url == "" {
		return false
	}
	ok, _, _ := checkHealth(context.Background(), url)
	return ok
}

func runOutputCommand(ctx context.Context, dir string, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() != nil {
			return "", ctx.Err()
		}
		if strings.TrimSpace(string(output)) != "" {
			return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(string(output)))
		}
		return "", err
	}
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	return string(output), nil
}

func loadRepoPendingCache(repoDir string) (dto.RepoPendingCommits, bool) {
	repoPendingCache.mu.RLock()
	entry, ok := repoPendingCache.items[repoDir]
	repoPendingCache.mu.RUnlock()
	if !ok || time.Since(entry.updatedAt) > repoCacheTTL {
		return dto.RepoPendingCommits{}, false
	}
	return entry.value, true
}

func storeRepoPendingCache(repoDir string, pending dto.RepoPendingCommits) {
	repoPendingCache.mu.Lock()
	defer repoPendingCache.mu.Unlock()
	repoPendingCache.items[repoDir] = repoPendingCacheEntry{
		value:     pending,
		updatedAt: time.Now(),
	}
}

func invalidateRepoPendingCache(repoDir string) {
	if repoDir == "" {
		return
	}
	repoPendingCache.mu.Lock()
	defer repoPendingCache.mu.Unlock()
	delete(repoPendingCache.items, filepath.Clean(repoDir))
}

func loadRepoPendingCommits(ctx context.Context, repoDir string) (dto.RepoPendingCommits, error) {
	upstream, err := getUpstreamBranch(ctx, repoDir)
	if err != nil {
		return dto.RepoPendingCommits{}, err
	}
	countOutput, err := runOutputCommand(ctx, repoDir, "git", "rev-list", "--count", "HEAD.."+upstream)
	if err != nil {
		return dto.RepoPendingCommits{}, err
	}
	count, err := strconv.Atoi(strings.TrimSpace(countOutput))
	if err != nil {
		return dto.RepoPendingCommits{}, err
	}
	if count == 0 {
		return dto.RepoPendingCommits{}, nil
	}
	output, err := runOutputCommand(ctx, repoDir, "git", "log", "--format=%H|%s", "HEAD.."+upstream)
	if err != nil {
		return dto.RepoPendingCommits{}, err
	}
	lines := strings.Split(strings.TrimSpace(output), "\n")
	commits := make([]dto.CommitInfo, 0, len(lines))
	for _, line := range lines {
		if strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 2)
		commit := dto.CommitInfo{Hash: parts[0]}
		if len(parts) > 1 {
			commit.Message = parts[1]
		}
		commits = append(commits, commit)
	}
	recent := commits
	if len(recent) > 10 {
		recent = recent[:10]
	}
	return dto.RepoPendingCommits{
		Count:   count,
		Recent:  recent,
		Commits: commits,
	}, nil
}

func checkHealth(ctx context.Context, url string) (bool, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return false, "", err
	}
	resp, err := httpClient.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return false, "", ctx.Err()
		}
		return false, "", err
	}
	defer resp.Body.Close()
	status := resp.Status
	return resp.StatusCode == http.StatusOK, status, nil
}

func resolveTaskTimeout(taskType string, env cfg.OpsEnvironment) time.Duration {
	if env.TaskTimeoutSeconds > 0 {
		return time.Duration(env.TaskTimeoutSeconds) * time.Second
	}
	if cfg.ExtConfig.Ops.TaskTimeoutSeconds > 0 {
		return time.Duration(cfg.ExtConfig.Ops.TaskTimeoutSeconds) * time.Second
	}
	switch taskType {
	case appModels.TaskTypeRestart:
		return 300 * time.Second
	default:
		return 900 * time.Second
	}
}

func broadcastTaskError(taskID int, task *appModels.OpsTask) {
	if task == nil {
		return
	}
	GetTaskManager().Broadcast(taskID, TaskEvent{
		Type: "error",
		Data: errorEvent{
			Status:     task.Status,
			Step:       task.Step,
			StepName:   task.StepName,
			ErrMsg:     task.ErrMsg,
			Suggestion: task.Suggestion,
		},
	})
}

func syncDir(srcDir, dstDir string) error {
	return syncDirWithCopy(srcDir, dstDir, copyDirContents)
}

func syncDirWithCopy(srcDir, dstDir string, copyContents func(string, string) error) error {
	if srcDir == "" || dstDir == "" {
		return errors.New("同步目录配置不完整")
	}
	srcInfo, err := os.Stat(srcDir)
	if err != nil {
		return err
	}
	if !srcInfo.IsDir() {
		return errors.New("构建产物目录不存在")
	}
	cleanDst := filepath.Clean(dstDir)
	if cleanDst == "/" || cleanDst == "." {
		return errors.New("目标目录不安全")
	}
	parentDir := filepath.Dir(cleanDst)
	if parentDir == "/" {
		return errors.New("目标目录不安全")
	}
	if err = os.MkdirAll(parentDir, 0o755); err != nil {
		return err
	}
	stageDir, err := os.MkdirTemp(parentDir, "."+filepath.Base(cleanDst)+".staging-")
	if err != nil {
		return err
	}
	cleanupStage := true
	defer func() {
		if cleanupStage {
			_ = os.RemoveAll(stageDir)
		}
	}()
	if err = copyContents(srcDir, stageDir); err != nil {
		return err
	}

	backupDir := filepath.Join(parentDir, fmt.Sprintf(".%s.backup-%d", filepath.Base(cleanDst), time.Now().UnixNano()))
	hasOld := false
	if _, statErr := os.Stat(cleanDst); statErr == nil {
		if err = os.Rename(cleanDst, backupDir); err != nil {
			return err
		}
		hasOld = true
	} else if !os.IsNotExist(statErr) {
		return statErr
	}
	if err = os.Rename(stageDir, cleanDst); err != nil {
		if hasOld {
			_ = os.Rename(backupDir, cleanDst)
		}
		return err
	}
	cleanupStage = false
	if hasOld {
		return os.RemoveAll(backupDir)
	}
	return nil
}

func copyDirContents(srcDir, dstDir string) error {
	entries, err := os.ReadDir(srcDir)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		srcPath := filepath.Join(srcDir, entry.Name())
		dstPath := filepath.Join(dstDir, entry.Name())
		if err = copyPath(srcPath, dstPath); err != nil {
			return err
		}
	}
	return nil
}

func copyPath(srcPath, dstPath string) error {
	info, err := os.Stat(srcPath)
	if err != nil {
		return err
	}
	if info.IsDir() {
		if err = os.MkdirAll(dstPath, info.Mode()); err != nil {
			return err
		}
		entries, err := os.ReadDir(srcPath)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if err = copyPath(filepath.Join(srcPath, entry.Name()), filepath.Join(dstPath, entry.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	srcFile, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer srcFile.Close()
	dstFile, err := os.OpenFile(dstPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, info.Mode())
	if err != nil {
		return err
	}
	defer dstFile.Close()
	_, err = io.Copy(dstFile, srcFile)
	return err
}

func limitLogSize(log string) string {
	buf := []byte(log)
	if len(buf) <= maxTaskLogBytes {
		return log
	}
	buf = buf[len(buf)-maxTaskLogBytes:]
	for len(buf) > 0 && !utf8.Valid(buf) {
		buf = buf[1:]
	}
	return string(buf)
}

func substringFromRuneOffset(value string, offset int) string {
	if offset <= 0 {
		return value
	}
	runes := []rune(value)
	if offset >= len(runes) {
		return ""
	}
	return string(runes[offset:])
}

func sendStatusSnapshot(send func(string, interface{}), task *appModels.OpsTask) {
	send("status", statusEvent{
		Status:     task.Status,
		Step:       task.Step,
		TotalSteps: task.TotalSteps,
		StepName:   task.StepName,
	})
}

func sendLogSnapshot(send func(string, interface{}), log string, lastOffset int) {
	offset := utf8.RuneCountInString(log)
	chunk := substringFromRuneOffset(log, lastOffset)
	if chunk == "" {
		return
	}
	send("log", logEvent{
		Line:   chunk,
		Offset: offset,
	})
}

func sendFinalEvent(send func(string, interface{}), task *appModels.OpsTask, domain string) {
	if task.Status == appModels.TaskStatusSuccess {
		send("done", doneEvent{
			Status:   task.Status,
			Summary:  task.Summary,
			Duration: durationBetween(task.StartedAt, task.FinishedAt),
			Domain:   domain,
		})
		return
	}
	send("error", errorEvent{
		Status:     task.Status,
		Step:       task.Step,
		StepName:   task.StepName,
		ErrMsg:     task.ErrMsg,
		Suggestion: task.Suggestion,
	})
}

func durationBetween(startedAt, finishedAt *time.Time) string {
	if startedAt == nil || finishedAt == nil {
		return ""
	}
	return finishedAt.Sub(*startedAt).Round(time.Second).String()
}

func isFinalStatus(status string) bool {
	return status == appModels.TaskStatusSuccess || status == appModels.TaskStatusFailed || status == appModels.TaskStatusCancelled
}

func applyTaskUpdates(task *appModels.OpsTask, updates map[string]interface{}) {
	for key, value := range updates {
		switch key {
		case "status":
			task.Status = value.(string)
		case "step":
			task.Step = value.(int)
		case "total_steps":
			task.TotalSteps = value.(int)
		case "step_name":
			task.StepName = value.(string)
		case "summary":
			task.Summary = value.(string)
		case "err_msg":
			task.ErrMsg = value.(string)
		case "suggestion":
			task.Suggestion = value.(string)
		case "commits":
			task.Commits = value.(string)
		case "log":
			task.Log = value.(string)
		case "started_at":
			task.StartedAt = value.(*time.Time)
		case "finished_at":
			task.FinishedAt = value.(*time.Time)
		}
	}
}
