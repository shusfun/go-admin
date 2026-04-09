package devctl

import (
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

func (a *App) checkPortConflicts(services []ServiceSpec, out io.Writer) error {
	var conflicts []string
	for _, service := range services {
		if service.Port == 0 {
			continue
		}
		if portOpen(service.Port) {
			conflicts = append(conflicts, fmt.Sprintf("%s 端口 %d 已被占用", service.Label, service.Port))
		}
	}
	if len(conflicts) > 0 {
		for _, item := range conflicts {
			fmt.Fprintln(out, item)
		}
		return errors.New("请先释放端口后再重试")
	}
	return nil
}

func (a *App) StartServices(services []ServiceSpec, out io.Writer) error {
	if out == nil {
		out = io.Discard
	}

	store := NewStateStore(a)
	dockerTargets := make([]string, 0)
	for _, service := range services {
		if service.Kind == ServiceDocker {
			dockerTargets = append(dockerTargets, service.ComposeName)
		}
	}

	if len(dockerTargets) > 0 {
		if err := ensureDir(filepath.Join(a.RepoRoot, ".tmp", "docker")); err != nil {
			return err
		}
		args := append(a.ComposeBaseArgs(true), "up", "-d")
		args = append(args, dockerTargets...)
		if err := a.runCommand("docker", args, RunOptions{Env: a.ComposeEnv(), Stdout: out, Stderr: out}); err != nil {
			return err
		}
		for _, target := range dockerTargets {
			if err := store.Update(func(state *RuntimeState) error {
				current := state.Services[target]
				current.Name = target
				current.Status = "running"
				current.Mode = "docker"
				current.Port = a.LocalServicePort(target)
				current.UpdatedAt = nowRFC3339()
				if current.StartedAt == "" {
					current.StartedAt = current.UpdatedAt
				}
				state.Services[target] = current
				return nil
			}); err != nil {
				return err
			}
		}
		fmt.Fprintf(out, "已启动基础设施：%s\n", strings.Join(dockerTargets, ", "))
	}

	localTargets := make([]ServiceSpec, 0)
	for _, service := range services {
		if service.Kind == ServiceLocal {
			localTargets = append(localTargets, service)
		}
	}
	if len(localTargets) == 0 {
		return nil
	}

	if err := a.checkPortConflicts(localTargets, out); err != nil {
		return err
	}

	for _, service := range localTargets {
		if err := a.startLocalService(service, out); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) startLocalService(service ServiceSpec, out io.Writer) error {
	exePath, err := os.Executable()
	if err != nil {
		return err
	}
	store := NewStateStore(a)

	args := []string{
		"--repo-root", a.RepoRoot,
		"--config", filepath.ToSlash(a.ConfigFile),
	}
	if rootProjectPrefix != "" {
		args = append(args, "--project-prefix", a.ProjectPrefix)
	}
	args = append(args, "agent", "run-service", service.Name)

	if err := store.Update(func(state *RuntimeState) error {
		current := state.Services[service.Name]
		current.Name = service.Name
		current.Status = serviceStatusStarting
		current.Mode = service.DefaultMode
		current.Port = service.Port
		current.LogPath = filepath.Join(a.LogsDir, service.Name+".log")
		current.LastError = ""
		current.ControllerPID = 0
		current.ChildPID = 0
		current.UpdatedAt = nowRFC3339()
		if current.StartedAt == "" {
			current.StartedAt = current.UpdatedAt
		}
		state.Services[service.Name] = current
		return nil
	}); err != nil {
		return err
	}

	switch runtime.GOOS {
	case "windows":
		if err := openWindowsTerminal(a, service, exePath, args); err != nil {
			return err
		}
	case "darwin":
		if err := openMacTerminal(a, exePath, args); err != nil {
			return err
		}
	default:
		logFile, err := openServiceLogFile(a, service.Name)
		if err != nil {
			return err
		}
		defer logFile.Close()

		cmd := exec.Command(exePath, args...)
		cmd.Dir = a.RepoRoot
		cmd.Stdout = logFile
		cmd.Stderr = logFile
		if err := cmd.Start(); err != nil {
			return err
		}
		_ = cmd.Process.Release()
	}

	fmt.Fprintf(out, "已发起启动：%s\n", service.Label)
	return nil
}

func (a *App) StopServices(services []ServiceSpec, out io.Writer) error {
	if out == nil {
		out = io.Discard
	}

	store := NewStateStore(a)
	state, err := a.ReconcileState()
	if err != nil {
		return err
	}

	dockerTargets := make([]string, 0)
	for _, service := range services {
		if service.Kind == ServiceDocker {
			dockerTargets = append(dockerTargets, service.ComposeName)
			continue
		}

		current := state.Services[service.Name]
		controllerPID := current.ControllerPID
		childPID := current.ChildPID
		if controllerPID == 0 && childPID == 0 {
			fmt.Fprintf(out, "%s 未记录运行 PID，跳过\n", service.Label)
			continue
		}
		if controllerPID > 0 {
			if err := stopProcess(controllerPID); err != nil {
				fmt.Fprintf(out, "%s 停止宿主失败：%v\n", service.Label, err)
			}
		}
		if childPID > 0 {
			if err := stopProcess(childPID); err != nil {
				fmt.Fprintf(out, "%s 停止子进程失败：%v\n", service.Label, err)
			}
		}
		_ = store.Update(func(state *RuntimeState) error {
			current := state.Services[service.Name]
			current.Status = serviceStatusStopped
			current.ControllerPID = 0
			current.ChildPID = 0
			current.UpdatedAt = nowRFC3339()
			current.ExitedAt = current.UpdatedAt
			state.Services[service.Name] = current
			return nil
		})
		fmt.Fprintf(out, "已停止：%s\n", service.Label)
	}

	if len(dockerTargets) > 0 {
		args := append(a.ComposeBaseArgs(true), "stop")
		args = append(args, dockerTargets...)
		if err := a.runCommand("docker", args, RunOptions{Env: a.ComposeEnv(), Stdout: out, Stderr: out}); err != nil {
			return err
		}
		for _, name := range dockerTargets {
			_ = store.Update(func(state *RuntimeState) error {
				current := state.Services[name]
				current.Status = serviceStatusStopped
				current.UpdatedAt = nowRFC3339()
				current.ExitedAt = current.UpdatedAt
				state.Services[name] = current
				return nil
			})
		}
		fmt.Fprintf(out, "已停止基础设施：%s\n", strings.Join(dockerTargets, ", "))
	}
	return nil
}

func (a *App) RestartServices(services []ServiceSpec, out io.Writer) error {
	if err := a.StopServices(services, out); err != nil {
		return err
	}
	time.Sleep(500 * time.Millisecond)
	return a.StartServices(services, out)
}

func (a *App) printServiceLogs(serviceName string, lines int, out io.Writer) error {
	if out == nil {
		out = os.Stdout
	}
	content, err := a.serviceLogTail(serviceName, lines)
	if err != nil {
		return err
	}
	fmt.Fprintln(out, content)
	return nil
}

func (a *App) serviceLogTail(serviceName string, lines int) (string, error) {
	logPath := filepath.Join(a.LogsDir, serviceName+".log")
	data, err := os.ReadFile(logPath)
	if err != nil {
		return "", err
	}
	content := strings.ReplaceAll(string(data), "\r\n", "\n")
	chunks := strings.Split(content, "\n")
	if len(chunks) > lines {
		chunks = chunks[len(chunks)-lines:]
	}
	return strings.Join(chunks, "\n"), nil
}
