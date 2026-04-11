package service

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	appModels "go-admin/app/ops/models"
	"go-admin/app/ops/service/dto"
	cfg "go-admin/config"
	"gorm.io/gorm"
)

func TestLimitLogSizeKeepsLatestContent(t *testing.T) {
	base := strings.Repeat("a", maxTaskLogBytes)
	log := "prefix-" + base + "-tail"
	got := limitLogSize(log)
	if len([]byte(got)) > maxTaskLogBytes {
		t.Fatalf("expected log size <= %d, got %d", maxTaskLogBytes, len([]byte(got)))
	}
	if !strings.HasSuffix(got, "-tail") {
		t.Fatalf("expected latest content to be retained")
	}
}

func TestEnsureFrontendProject(t *testing.T) {
	repoDir := mustMkdirTempDir(t)
	createFile(t, filepath.Join(repoDir, "package.json"), "{}")
	createFile(t, filepath.Join(repoDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'")
	createFile(t, filepath.Join(repoDir, "vite.config.ts"), "export default {}")

	if err := ensureFrontendProject(repoDir); err != nil {
		t.Fatalf("expected valid frontend project, got error: %v", err)
	}
}

func TestEnsureFrontendProjectRejectsMissingViteConfig(t *testing.T) {
	repoDir := mustMkdirTempDir(t)
	createFile(t, filepath.Join(repoDir, "package.json"), "{}")
	createFile(t, filepath.Join(repoDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'")

	if err := ensureFrontendProject(repoDir); err == nil {
		t.Fatalf("expected error when vite config is missing")
	}
}

func TestSyncDirReplacesExistingFiles(t *testing.T) {
	srcDir := mustMkdirTempDir(t)
	dstDir := mustMkdirTempDir(t)

	createFile(t, filepath.Join(srcDir, "index.html"), "new")
	createFile(t, filepath.Join(srcDir, "assets", "app.js"), "console.log('new')")
	createFile(t, filepath.Join(dstDir, "old.txt"), "old")

	if err := syncDir(srcDir, dstDir); err != nil {
		t.Fatalf("syncDir failed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dstDir, "old.txt")); !os.IsNotExist(err) {
		t.Fatalf("expected stale file to be removed")
	}
	content, err := os.ReadFile(filepath.Join(dstDir, "index.html"))
	if err != nil {
		t.Fatalf("expected published file to exist: %v", err)
	}
	if string(content) != "new" {
		t.Fatalf("unexpected file content: %s", string(content))
	}
}

func TestSyncDirKeepsExistingFilesWhenStagingFails(t *testing.T) {
	srcDir := mustMkdirTempDir(t)
	dstDir := mustMkdirTempDir(t)

	createFile(t, filepath.Join(dstDir, "index.html"), "old")
	createFile(t, filepath.Join(srcDir, "index.html"), "new")

	if err := syncDirWithCopy(srcDir, dstDir, func(string, string) error {
		return errors.New("staging copy failed")
	}); err == nil {
		t.Fatalf("expected syncDir to fail when staging copy fails")
	}

	content, err := os.ReadFile(filepath.Join(dstDir, "index.html"))
	if err != nil {
		t.Fatalf("expected old publish dir to remain readable: %v", err)
	}
	if string(content) != "old" {
		t.Fatalf("expected old publish dir to stay in place, got %q", string(content))
	}
}

func TestGetRepoPendingCommitsReturnsRecentAndFullList(t *testing.T) {
	fixture := createGitFixture(t, 12, true)

	pending, err := getRepoPendingCommits(fixture.localRepo)
	if err != nil {
		t.Fatalf("getRepoPendingCommits failed: %v", err)
	}
	if pending.Count != 12 {
		t.Fatalf("expected 12 pending commits, got %d", pending.Count)
	}
	if len(pending.Recent) != 10 {
		t.Fatalf("expected 10 recent commits, got %d", len(pending.Recent))
	}
	if len(pending.Commits) != 12 {
		t.Fatalf("expected full commit list, got %d", len(pending.Commits))
	}
	if !strings.Contains(pending.Commits[0].Message, "remote commit 12") {
		t.Fatalf("expected newest commit first, got %s", pending.Commits[0].Message)
	}
}

func TestEnsureGitDeployReadyRejectsDirtyWorktree(t *testing.T) {
	fixture := createGitFixture(t, 1, true)
	createFile(t, filepath.Join(fixture.localRepo, "dirty.txt"), "dirty")

	err := ensureGitDeployReady(context.Background(), fixture.localRepo, false)
	if err == nil || !strings.Contains(err.Error(), "未提交变更") {
		t.Fatalf("expected dirty worktree error, got %v", err)
	}
}

func TestEnsureGitDeployReadyRejectsMissingUpstream(t *testing.T) {
	fixture := createGitFixture(t, 0, false)

	err := ensureGitDeployReady(context.Background(), fixture.localRepo, false)
	if err == nil || !strings.Contains(err.Error(), "上游分支") {
		t.Fatalf("expected missing upstream error, got %v", err)
	}
}

func TestGetRepoPendingCommitsUsesCacheWithinTTL(t *testing.T) {
	fixture := createGitFixture(t, 1, true)
	repoPendingCache.mu.Lock()
	repoPendingCache.items = make(map[string]repoPendingCacheEntry)
	repoPendingCache.mu.Unlock()

	first, err := getRepoPendingCommits(fixture.localRepo)
	if err != nil {
		t.Fatalf("first getRepoPendingCommits failed: %v", err)
	}

	seedDir := filepath.Join(filepath.Dir(fixture.localRepo), "seed")
	createFile(t, filepath.Join(seedDir, "later.txt"), "later")
	runGitCommand(t, seedDir, "add", ".")
	runGitCommand(t, seedDir, "commit", "-m", "later commit")
	runGitCommand(t, seedDir, "push", "origin", "main")

	second, err := getRepoPendingCommits(fixture.localRepo)
	if err != nil {
		t.Fatalf("second getRepoPendingCommits failed: %v", err)
	}
	if second.Count != first.Count {
		t.Fatalf("expected cached count %d, got %d", first.Count, second.Count)
	}
}

func TestInvalidateRepoPendingCacheClearsEntry(t *testing.T) {
	repoDir := filepath.Clean(mustMkdirTempDir(t))
	storeRepoPendingCache(repoDir, dto.RepoPendingCommits{Count: 3})
	if _, ok := loadRepoPendingCache(repoDir); !ok {
		t.Fatalf("expected cache entry to exist")
	}
	invalidateRepoPendingCache(repoDir)
	if _, ok := loadRepoPendingCache(repoDir); ok {
		t.Fatalf("expected cache entry to be removed")
	}
}

func TestWaitForHealthLogsRetriesAndSuccess(t *testing.T) {
	var attempts atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		current := attempts.Add(1)
		if current < 3 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	var logs []string
	err := waitForHealth(context.Background(), server.URL, func(line string) {
		logs = append(logs, line)
	})
	if err != nil {
		t.Fatalf("waitForHealth failed: %v", err)
	}
	if len(logs) < 3 {
		t.Fatalf("expected retry and success logs, got %d entries", len(logs))
	}
	if !strings.Contains(logs[0], "第 1/10 次重试失败") {
		t.Fatalf("expected retry log, got %q", logs[0])
	}
	if !strings.Contains(logs[len(logs)-1], "服务已就绪") {
		t.Fatalf("expected success log, got %q", logs[len(logs)-1])
	}
}

func TestResolveTaskTimeoutUsesOverride(t *testing.T) {
	cfg.ExtConfig = cfg.Extend{
		Ops: cfg.OpsConfig{
			TaskTimeoutSeconds: 600,
		},
	}
	env := cfg.OpsEnvironment{TaskTimeoutSeconds: 120}
	if got := resolveTaskTimeout(appModels.TaskTypeDeployAll, env); got != 120*time.Second {
		t.Fatalf("expected env timeout override, got %s", got)
	}
	env.TaskTimeoutSeconds = 0
	if got := resolveTaskTimeout(appModels.TaskTypeRestart, env); got != 600*time.Second {
		t.Fatalf("expected global timeout override, got %s", got)
	}
	cfg.ExtConfig = cfg.Extend{}
	if got := resolveTaskTimeout(appModels.TaskTypeRestart, cfg.OpsEnvironment{}); got != 300*time.Second {
		t.Fatalf("expected restart default timeout, got %s", got)
	}
}

func TestGetComposeFileUsesRepoDirForRelativePath(t *testing.T) {
	repoDir := mustMkdirTempDir(t)
	env := cfg.OpsEnvironment{
		Backend: cfg.OpsBackendTarget{
			RepoDir:     repoDir,
			ComposeFile: "deploy/docker-compose.yml",
		},
	}
	if got := getComposeFile(env); got != filepath.Join(repoDir, "deploy", "docker-compose.yml") {
		t.Fatalf("expected compose file to resolve from repo dir, got %q", got)
	}
}

func TestTaskRunnerRunDeployBackendCompletesFullUpdateChain(t *testing.T) {
	fixture := createGitFixture(t, 1, true)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	dockerLogDir := mustMkdirTempDir(t)
	dockerLog, err := filepath.Abs(filepath.Join(dockerLogDir, "docker.log"))
	if err != nil {
		t.Fatalf("resolve docker log path failed: %v", err)
	}
	installFakeCommand(t, "docker", dockerLog)

	db := openOpsTestDB(t)
	task := &appModels.OpsTask{
		Env:    "dev",
		Type:   appModels.TaskTypeDeployBackend,
		Status: appModels.TaskStatusQueued,
	}
	if err := db.Create(task).Error; err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	runner := &TaskRunner{
		db:     db,
		taskID: task.Id,
		env: cfg.OpsEnvironment{
			Key:    "dev",
			Domain: "https://dev.example.com",
			Backend: cfg.OpsBackendTarget{
				RepoDir:     fixture.localRepo,
				ComposeFile: filepath.Join(fixture.localRepo, "docker-compose.yml"),
				ServiceName: "backend",
				HealthURL:   server.URL,
			},
		},
		fetchedRepos: make(map[string]struct{}),
	}

	runner.Run(context.Background())

	stored := &appModels.OpsTask{}
	if err := db.First(stored, task.Id).Error; err != nil {
		t.Fatalf("reload task failed: %v", err)
	}
	if stored.Status != appModels.TaskStatusSuccess {
		t.Fatalf("expected success status, got %s, err=%q log=%q", stored.Status, stored.ErrMsg, stored.Log)
	}
	if stored.Summary != "后端更新完成" {
		t.Fatalf("expected backend success summary, got %q", stored.Summary)
	}
	if stored.TotalSteps != 4 {
		t.Fatalf("expected 4 backend steps, got %d", stored.TotalSteps)
	}
	if stored.StepName != "健康检查" {
		t.Fatalf("expected final step to be health check, got %q", stored.StepName)
	}
	if !strings.Contains(stored.Log, "git pull --ff-only") {
		t.Fatalf("expected log to include git pull, got %q", stored.Log)
	}
	if !strings.Contains(stored.Log, "按配置自动执行幂等迁移检查") {
		t.Fatalf("expected restart migration reminder in log, got %q", stored.Log)
	}
	if !strings.Contains(stored.Log, "[健康检查] 服务已就绪") {
		t.Fatalf("expected health success log, got %q", stored.Log)
	}

	dockerOutput, err := os.ReadFile(dockerLog)
	if err != nil {
		t.Fatalf("read docker log failed: %v", err)
	}
	dockerCalls := string(dockerOutput)
	if !strings.Contains(dockerCalls, "compose -f "+filepath.Join(fixture.localRepo, "docker-compose.yml")+" build backend") {
		t.Fatalf("expected docker build call, got %q", dockerCalls)
	}
	if !strings.Contains(dockerCalls, "compose -f "+filepath.Join(fixture.localRepo, "docker-compose.yml")+" up -d backend") {
		t.Fatalf("expected docker up call, got %q", dockerCalls)
	}
}

func TestTaskRunnerRunRestartBackendCompletesRestartChain(t *testing.T) {
	repoDir := mustMkdirTempDir(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	dockerLogDir := mustMkdirTempDir(t)
	dockerLog, err := filepath.Abs(filepath.Join(dockerLogDir, "docker.log"))
	if err != nil {
		t.Fatalf("resolve docker log path failed: %v", err)
	}
	installFakeCommand(t, "docker", dockerLog)

	db := openOpsTestDB(t)
	task := &appModels.OpsTask{
		Env:    "dev",
		Type:   appModels.TaskTypeRestart,
		Status: appModels.TaskStatusQueued,
	}
	if err := db.Create(task).Error; err != nil {
		t.Fatalf("create task failed: %v", err)
	}

	runner := &TaskRunner{
		db:     db,
		taskID: task.Id,
		env: cfg.OpsEnvironment{
			Key:    "dev",
			Domain: "https://dev.example.com",
			Backend: cfg.OpsBackendTarget{
				RepoDir:     repoDir,
				ComposeFile: filepath.Join(repoDir, "docker-compose.yml"),
				ServiceName: "backend",
				HealthURL:   server.URL,
			},
		},
		fetchedRepos: make(map[string]struct{}),
	}

	runner.Run(context.Background())

	stored := &appModels.OpsTask{}
	if err := db.First(stored, task.Id).Error; err != nil {
		t.Fatalf("reload task failed: %v", err)
	}
	if stored.Status != appModels.TaskStatusSuccess {
		t.Fatalf("expected success status, got %s, err=%q log=%q", stored.Status, stored.ErrMsg, stored.Log)
	}
	if stored.Summary != "后端重启完成" {
		t.Fatalf("expected restart success summary, got %q", stored.Summary)
	}
	if stored.TotalSteps != 2 {
		t.Fatalf("expected restart flow to have 2 steps, got %d", stored.TotalSteps)
	}

	dockerOutput, err := os.ReadFile(dockerLog)
	if err != nil {
		t.Fatalf("read docker log failed: %v", err)
	}
	if !strings.Contains(string(dockerOutput), "compose -f "+filepath.Join(repoDir, "docker-compose.yml")+" restart backend") {
		t.Fatalf("expected docker restart call, got %q", string(dockerOutput))
	}
}

type gitFixture struct {
	localRepo string
}

func mustMkdirTempDir(t *testing.T) string {
	t.Helper()
	dir, err := os.MkdirTemp(".", ".ops-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	absDir, err := filepath.Abs(dir)
	if err != nil {
		t.Fatalf("failed to resolve temp dir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.RemoveAll(absDir)
	})
	return absDir
}

func createFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("failed to create dir: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}
}

func createGitFixture(t *testing.T, remoteCommits int, setUpstream bool) gitFixture {
	t.Helper()

	root := mustMkdirTempDir(t)
	absRoot, err := filepath.Abs(root)
	if err != nil {
		t.Fatalf("failed to resolve abs path: %v", err)
	}
	remoteDir := filepath.Join(absRoot, "remote.git")
	seedDir := filepath.Join(absRoot, "seed")
	localRepo := filepath.Join(absRoot, "local")

	runGitCommand(t, ".", "init", "--bare", remoteDir)
	runGitCommand(t, ".", "init", "-b", "main", seedDir)
	configureGitUser(t, seedDir)
	createFile(t, filepath.Join(seedDir, "README.md"), "seed")
	runGitCommand(t, seedDir, "add", ".")
	runGitCommand(t, seedDir, "commit", "-m", "initial commit")
	runGitCommand(t, seedDir, "remote", "add", "origin", remoteDir)
	runGitCommand(t, seedDir, "push", "-u", "origin", "main")

	runGitCommand(t, root, "clone", remoteDir, localRepo)
	configureGitUser(t, localRepo)
	ensureGitMainBranch(t, localRepo)
	if setUpstream {
		runGitCommand(t, localRepo, "branch", "--set-upstream-to=origin/main", "main")
	} else {
		runGitCommand(t, localRepo, "branch", "--unset-upstream")
	}

	for i := 1; i <= remoteCommits; i++ {
		createFile(t, filepath.Join(seedDir, "commits", "file-"+strings.ReplaceAll(strings.Repeat("x", i), "/", "_")+".txt"), strings.Repeat("x", i))
		runGitCommand(t, seedDir, "add", ".")
		runGitCommand(t, seedDir, "commit", "-m", "remote commit "+strconv.Itoa(i))
		runGitCommand(t, seedDir, "push", "origin", "main")
	}

	return gitFixture{localRepo: localRepo}
}

func configureGitUser(t *testing.T, dir string) {
	t.Helper()
	runGitCommand(t, dir, "config", "user.name", "ops-test")
	runGitCommand(t, dir, "config", "user.email", "ops-test@example.com")
}

func runGitCommand(t *testing.T, dir string, args ...string) string {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s failed: %v, output: %s", strings.Join(args, " "), err, string(output))
	}
	return strings.TrimSpace(string(output))
}

func ensureGitMainBranch(t *testing.T, dir string) {
	t.Helper()
	cmd := exec.Command("git", "rev-parse", "--verify", "main")
	cmd.Dir = dir
	if err := cmd.Run(); err == nil {
		runGitCommand(t, dir, "checkout", "main")
		return
	}
	runGitCommand(t, dir, "checkout", "-b", "main", "origin/main")
}

func openOpsTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	if err := db.AutoMigrate(&appModels.OpsTask{}); err != nil {
		t.Fatalf("migrate ops_task failed: %v", err)
	}
	return db
}

func installFakeCommand(t *testing.T, name string, logPath string) {
	t.Helper()

	binDir := mustMkdirTempDir(t)
	commandPath := filepath.Join(binDir, name)
	content := []byte("#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"" + logPath + "\"\n")
	if runtime.GOOS == "windows" {
		commandPath += ".cmd"
		content = []byte("@echo off\r\necho %*>> \"" + strings.ReplaceAll(logPath, "/", "\\") + "\"\r\n")
	}
	if err := os.WriteFile(commandPath, content, 0o755); err != nil {
		t.Fatalf("write fake command failed: %v", err)
	}
	t.Setenv("PATH", binDir+string(os.PathListSeparator)+os.Getenv("PATH"))
}
