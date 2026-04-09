package devctl

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"

	"golang.org/x/term"
)

func (a *App) doctorReport() []string {
	report := a.doctorCheckReport()
	lines := make([]string, 0, len(report))
	for _, current := range report {
		if current.OK {
			lines = append(lines, fmt.Sprintf("%-16s %s", current.Name, current.Output))
			continue
		}
		lines = append(lines, fmt.Sprintf("%-16s 缺失或不可用", current.Name))
	}
	return lines
}

type doctorCheck struct {
	Name   string
	Output string
	OK     bool
}

func (a *App) doctorCheckReport() []doctorCheck {
	type item struct {
		Name    string
		Command string
		Args    []string
	}
	items := []item{
		{Name: "go", Command: "go", Args: []string{"version"}},
		{Name: "node", Command: "node", Args: []string{"--version"}},
		{Name: "pnpm", Command: "pnpm", Args: []string{"--version"}},
		{Name: "docker", Command: "docker", Args: []string{"--version"}},
		{Name: "docker compose", Command: "docker", Args: []string{"compose", "version"}},
	}

	lines := make([]doctorCheck, 0, len(items))
	for _, current := range items {
		output, err := a.captureCommand(current.Command, current.Args, RunOptions{})
		if err != nil {
			lines = append(lines, doctorCheck{Name: current.Name, OK: false})
			continue
		}
		lines = append(lines, doctorCheck{Name: current.Name, Output: output, OK: true})
	}
	return lines
}

func (a *App) doctor() error {
	for _, line := range a.doctorReport() {
		fmt.Println(line)
	}
	return nil
}

func (a *App) runSetup(withOpenAPI, skipInfra bool, out io.Writer) error {
	if out == nil {
		out = os.Stdout
	}

	report := a.doctorCheckReport()
	fmt.Fprintln(out, "==> 环境检查")
	missing := make([]string, 0)
	for _, current := range report {
		if current.OK {
			fmt.Fprintf(out, "  [OK] %-15s %s\n", current.Name, current.Output)
			continue
		}
		fmt.Fprintf(out, "  [缺失] %s\n", current.Name)
		if skipInfra && (current.Name == "docker" || current.Name == "docker compose") {
			continue
		}
		missing = append(missing, current.Name)
	}
	if len(missing) > 0 {
		return fmt.Errorf("初始化中止，缺少必需环境：%s", strings.Join(missing, ", "))
	}

	fmt.Fprintln(out, "\n==> 安装依赖")
	if err := a.runDeps("all"); err != nil {
		return fmt.Errorf("依赖安装失败: %w", err)
	}

	if withOpenAPI {
		fmt.Fprintln(out, "\n==> 生成 OpenAPI")
		if err := a.runOpenAPI(); err != nil {
			return fmt.Errorf("OpenAPI 同步失败: %w", err)
		}
	}

	if skipInfra {
		fmt.Fprintln(out, "\n==> 跳过基础设施启动")
	} else {
		fmt.Fprintln(out, "\n==> 启动基础设施")
		services, err := normalizeServiceList(a, []string{"postgres", "redis"})
		if err != nil {
			return err
		}
		if err := a.StartServices(services, out); err != nil {
			return fmt.Errorf("基础设施启动失败: %w", err)
		}
	}

	fmt.Fprintln(out, "\n==> 安装状态")
	if fileExists(a.SettingsFile) && fileExists(a.InstallLockFile) {
		fmt.Fprintln(out, "  当前状态：已安装")
	} else {
		fmt.Fprintln(out, "  当前状态：未安装，将进入 Setup Wizard")
	}

	fmt.Fprintln(out, "\n==> 完成")
	if skipInfra {
		fmt.Fprintln(out, "  可继续执行：devctl service start postgres redis")
	}
	fmt.Fprintln(out, "  然后执行：devctl service start backend")
	fmt.Fprintln(out, "  如需前端：devctl service start admin")
	return nil
}

func (a *App) renameProjectPrefix(next string, reset bool, out io.Writer) error {
	if out == nil {
		out = os.Stdout
	}
	if reset {
		if err := os.Remove(a.ProfilePath); err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
		fmt.Fprintf(out, "已清除本地项目前缀覆盖，恢复默认值：%s\n", normalizeProjectPrefix(a.PackageName))
		return nil
	}
	next = normalizeProjectPrefix(next)
	if err := saveProfile(a.ProfilePath, devctlProfile{ProjectPrefix: next}); err != nil {
		return err
	}
	fmt.Fprintf(out, "已设置本地默认项目前缀：%s\n", next)
	fmt.Fprintf(out, "后续未显式传入 --project-prefix 时将默认使用该值\n")
	return nil
}

func (a *App) printEnv() {
	fmt.Printf("%-18s %s\n", "仓库根目录", a.RepoRoot)
	fmt.Printf("%-18s %s\n", "配置文件", a.ConfigFile)
	fmt.Printf("%-18s %s\n", "项目名前缀", a.ProjectPrefix)
	fmt.Printf("%-18s %d\n", "后端端口", a.LocalServicePort("backend"))
	fmt.Printf("%-18s %d\n", "管理端端口", a.LocalServicePort("admin"))
	fmt.Printf("%-18s %d\n", "移动端端口", a.LocalServicePort("mobile"))
	fmt.Printf("%-18s %d\n", "Showcase 端口", a.LocalServicePort("showcase"))
	fmt.Printf("%-18s %d\n", "PostgreSQL 端口", a.LocalServicePort("postgres"))
	fmt.Printf("%-18s %d\n", "Redis 端口", a.LocalServicePort("redis"))
	fmt.Printf("%-18s %s\n", "devctl 工作目录", a.DevctlDir)
	fmt.Printf("%-18s %s\n", "状态文件", a.StatePath)
	fmt.Printf("%-18s %s\n", "日志目录", a.LogsDir)
	fmt.Printf("%-18s %s\n", "前缀配置文件", a.ProfilePath)
	fmt.Printf("%-18s %s\n", "devctl 二进制", a.DevctlBinary)
	fmt.Printf("%-18s %s\n", "go-admin 二进制", a.BackendBinary)
}

func (a *App) printSetupStatus() {
	if fileExists(a.SettingsFile) && fileExists(a.InstallLockFile) {
		fmt.Println("当前状态：已安装")
		return
	}
	fmt.Println("当前状态：未安装，将进入 Setup Wizard")
}

func (a *App) runDeps(target string) error {
	switch target {
	case "backend":
		return a.runCommand("go", []string{"mod", "tidy"}, RunOptions{Env: a.GoEnv()})
	case "frontend":
		return a.runCommand("pnpm", []string{"install", "--store-dir", "./.pnpm-store"}, RunOptions{Dir: a.RepoRoot})
	case "all":
		if err := a.runDeps("backend"); err != nil {
			return err
		}
		return a.runDeps("frontend")
	default:
		return fmt.Errorf("未知依赖目标：%s", target)
	}
}

func (a *App) runBuild(target string) error {
	switch target {
	case "backend":
		if err := ensureDir(a.GoBinDir); err != nil {
			return err
		}
		return a.runCommand("go", []string{"build", "-ldflags=-w -s", "-o", a.BackendBinary, "."}, RunOptions{
			Dir: a.RepoRoot,
			Env: mergeEnv(a.GoEnv(), map[string]string{"CGO_ENABLED": "0"}),
		})
	case "admin":
		return a.runCommand("pnpm", []string{"--filter", "@suiyuan/admin-web", "build"}, RunOptions{Dir: a.RepoRoot})
	case "mobile":
		return a.runCommand("pnpm", []string{"--filter", "@suiyuan/mobile-h5", "build"}, RunOptions{Dir: a.RepoRoot})
	case "showcase":
		return a.runCommand("pnpm", []string{"--filter", "@suiyuan/ui-showcase", "build"}, RunOptions{Dir: a.RepoRoot})
	case "frontend":
		return a.runCommand("pnpm", []string{"build"}, RunOptions{Dir: a.RepoRoot})
	case "docker":
		return a.runCommand("docker", []string{"build", "-t", a.PackageName + ":latest", "."}, RunOptions{Dir: a.RepoRoot})
	case "all":
		for _, item := range []string{"backend", "frontend"} {
			if err := a.runBuild(item); err != nil {
				return err
			}
		}
		return nil
	default:
		return fmt.Errorf("未知构建目标：%s", target)
	}
}

func (a *App) runTypecheck() error {
	return a.runCommand("pnpm", []string{"typecheck"}, RunOptions{Dir: a.RepoRoot})
}

func (a *App) runDockerUp() error {
	return a.runCommand("docker", append(a.ComposeBaseArgs(false), "up", "-d"), RunOptions{
		Dir: a.RepoRoot,
		Env: a.ComposeEnv(),
	})
}

func (a *App) runDockerDown() error {
	return a.runCommand("docker", append(a.ComposeBaseArgs(false), "down"), RunOptions{
		Dir: a.RepoRoot,
		Env: a.ComposeEnv(),
	})
}

func (a *App) runDeploy() error {
	if err := a.runBuild("docker"); err != nil {
		return err
	}
	return a.runDockerUp()
}

func (a *App) runTest(target string) error {
	switch target {
	case "backend":
		return a.runCommand("go", []string{"test", "./..."}, RunOptions{Dir: a.RepoRoot, Env: a.GoEnv()})
	case "frontend":
		return a.runCommand("pnpm", []string{"test"}, RunOptions{Dir: a.RepoRoot})
	case "all":
		if err := a.runTest("backend"); err != nil {
			return err
		}
		return a.runTest("frontend")
	default:
		return fmt.Errorf("未知测试目标：%s", target)
	}
}

func (a *App) runOpenAPI() error {
	if err := ensureDir(a.GoBinDir); err != nil {
		return err
	}
	swagBinary := filepath.Join(a.GoBinDir, executableName("swag"))
	if !fileExists(swagBinary) {
		if err := a.runCommand("go", []string{"install", "github.com/swaggo/swag/cmd/swag@v1.16.4"}, RunOptions{
			Dir: a.RepoRoot,
			Env: mergeEnv(a.GoEnv(), map[string]string{"GOWORK": "off"}),
		}); err != nil {
			return err
		}
	}
	if err := a.runCommand(swagBinary, []string{"init", "-g", "main.go", "--parseDependency", "--parseDepth=6", "--instanceName", "admin", "-o", "./docs/admin"}, RunOptions{
		Dir: a.RepoRoot,
	}); err != nil {
		return err
	}
	if err := a.runCommand("node", []string{"./scripts/sync-openapi.mjs"}, RunOptions{Dir: a.RepoRoot}); err != nil {
		return err
	}
	if err := a.runCommand("pnpm", []string{"run", "openapi"}, RunOptions{Dir: a.RepoRoot}); err != nil {
		return err
	}
	return a.runCommand("pnpm", []string{"typecheck"}, RunOptions{Dir: a.RepoRoot})
}

func (a *App) runFmt() error {
	var files []string
	err := filepath.WalkDir(a.RepoRoot, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			switch d.Name() {
			case ".git", "node_modules", ".pnpm-store", ".tmp", "vendor":
				if path != a.RepoRoot {
					return filepath.SkipDir
				}
			}
			return nil
		}
		if strings.HasSuffix(path, ".go") {
			files = append(files, path)
		}
		return nil
	})
	if err != nil {
		return err
	}
	if len(files) == 0 {
		fmt.Println("未找到 Go 文件")
		return nil
	}
	args := append([]string{"-w"}, files...)
	return a.runCommand("gofmt", args, RunOptions{})
}

func (a *App) runMigrate() error {
	return a.runCommand("go", []string{"run", ".", "migrate", "-c", filepath.ToSlash(a.ConfigFile)}, RunOptions{
		Dir: a.RepoRoot,
		Env: a.GoEnv(),
	})
}

func (a *App) runReinit(yes bool) error {
	if !yes {
		if !terminalAvailable() {
			return errors.New("非交互终端执行 reinit 必须显式传入 --yes")
		}
		fmt.Print("⚠️ 将清理本地缓存、dist、安装锁、devctl 状态和二进制，确认继续？[y/N]: ")
		reader := bufio.NewReader(os.Stdin)
		value, _ := reader.ReadString('\n')
		value = strings.TrimSpace(strings.ToLower(value))
		if value != "y" && value != "yes" {
			return errors.New("已取消 reinit")
		}
	}

	if commandExists("docker") {
		if err := a.runCommand("docker", append(a.ComposeBaseArgs(true), "down", "--volumes", "--remove-orphans"), RunOptions{Env: a.ComposeEnv()}); err != nil {
			fmt.Fprintf(os.Stderr, "开发基础设施清理失败：%v\n", err)
		}
		if err := a.runCommand("docker", append(a.ComposeBaseArgs(false), "down", "--volumes", "--remove-orphans"), RunOptions{Env: a.ComposeEnv()}); err != nil {
			fmt.Fprintf(os.Stderr, "应用容器清理失败：%v\n", err)
		}
	}

	for _, target := range []string{
		filepath.Join(a.RepoRoot, ".tmp", "go"),
		filepath.Join(a.RepoRoot, ".tmp", "bin"),
		filepath.Join(a.RepoRoot, ".tmp", "docker"),
		filepath.Join(a.RepoRoot, "temp", "devctl"),
		a.AdminDistDir,
		a.MobileDistDir,
		a.ShowcaseDistDir,
		a.RootDistDir,
		a.BackendBinary,
		a.DevctlBinary,
		a.InstallLockFile,
	} {
		if err := os.RemoveAll(target); err != nil {
			return err
		}
	}
	fmt.Println("环境重置完成")
	return nil
}

func (a *App) printStatus() error {
	state, err := a.ReconcileState()
	if err != nil {
		return err
	}
	fmt.Printf("%-10s %-10s %-8s %-10s %-6s %s\n", "服务", "状态", "启动", "模式", "端口", "日志")
	for _, service := range allServices(a) {
		current := state.Services[service.Name]
		logPath := current.LogPath
		if logPath == "" && service.Kind == ServiceLocal {
			logPath = filepath.Join(a.LogsDir, service.Name+".log")
		}
		fmt.Printf("%-10s %-10s %-8s %-10s %-6d %s\n", service.Name, displayStatus(current.Status), startupLabel(current.Status), displayMode(current.Mode), service.Port, logPath)
	}
	return nil
}

func mergeEnv(values ...map[string]string) map[string]string {
	result := map[string]string{}
	for _, set := range values {
		for key, value := range set {
			result[key] = value
		}
	}
	return result
}

func terminalAvailable() bool {
	for _, file := range []*os.File{os.Stdin, os.Stdout, os.Stderr} {
		if file != nil && term.IsTerminal(int(file.Fd())) {
			return true
		}
	}
	return false
}

func ioMultiWriter(writers ...io.Writer) io.Writer {
	return io.MultiWriter(writers...)
}

func (a *App) runAgentService(serviceName string) error {
	service, err := findService(a, serviceName)
	if err != nil {
		return err
	}
	if service.Kind != ServiceLocal {
		return fmt.Errorf("agent 仅支持本地服务：%s", service.Name)
	}

	logFile, err := openServiceLogFile(a, service.Name)
	if err != nil {
		return err
	}
	defer logFile.Close()

	cmdSpec := service.Command(a)
	store := NewStateStore(a)

	cmd := exec.Command(cmdSpec.Name, cmdSpec.Args...)
	cmd.Dir = cmdSpec.Dir
	if cmd.Dir == "" {
		cmd.Dir = a.RepoRoot
	}
	cmd.Env = os.Environ()
	for key, value := range cmdSpec.Env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
	}
	cmd.Stdout = ioMultiWriter(os.Stdout, logFile)
	cmd.Stderr = ioMultiWriter(os.Stderr, logFile)
	cmd.Stdin = os.Stdin

	if err := cmd.Start(); err != nil {
		return err
	}

	if err := store.Update(func(state *RuntimeState) error {
		state.Services[service.Name] = ServiceState{
			Name:          service.Name,
			Status:        serviceStatusStarting,
			Mode:          service.DefaultMode,
			Port:          service.Port,
			ControllerPID: os.Getpid(),
			ChildPID:      cmd.Process.Pid,
			LogPath:       filepath.Join(a.LogsDir, service.Name+".log"),
			StartedAt:     nowRFC3339(),
			UpdatedAt:     nowRFC3339(),
		}
		return nil
	}); err != nil {
		return err
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigCh)
	go func() {
		<-sigCh
		if cmd.Process != nil {
			_ = stopProcess(cmd.Process.Pid)
		}
	}()

	err = cmd.Wait()
	lastError := ""
	status := serviceStatusStopped
	if err != nil {
		status = serviceStatusFailed
		lastError = err.Error()
	}
	return store.Update(func(state *RuntimeState) error {
		current := state.Services[service.Name]
		current.Status = status
		current.LastError = lastError
		current.ControllerPID = 0
		current.ChildPID = 0
		current.UpdatedAt = nowRFC3339()
		current.ExitedAt = current.UpdatedAt
		state.Services[service.Name] = current
		return nil
	})
}
