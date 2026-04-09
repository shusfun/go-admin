package devctl

import (
	"os/exec"
	"runtime"
	"strconv"
)

const (
	serviceStatusStarting = "starting"
	serviceStatusRunning  = "running"
	serviceStatusStopped  = "stopped"
	serviceStatusFailed   = "failed"
)

func (a *App) ReconcileState() (RuntimeState, error) {
	store := NewStateStore(a)
	var snapshot RuntimeState
	err := store.Update(func(state *RuntimeState) error {
		for _, service := range allServices(a) {
			current := state.Services[service.Name]
			current.Name = service.Name
			current.Port = service.Port
			if current.Mode == "" {
				current.Mode = service.DefaultMode
			}

			if service.Kind == ServiceDocker {
				if portOpen(service.Port) {
					current.Status = serviceStatusRunning
				} else if current.Status == "" || current.Status == serviceStatusRunning || current.Status == serviceStatusStarting {
					current.Status = serviceStatusStopped
				}
				current.UpdatedAt = nowRFC3339()
				state.Services[service.Name] = current
				continue
			}

			controllerAlive := processAlive(current.ControllerPID)
			childAlive := processAlive(current.ChildPID)
			portAlive := portOpen(service.Port)

			if !controllerAlive && childAlive {
				_ = stopProcess(current.ChildPID)
				childAlive = processAlive(current.ChildPID)
				portAlive = portOpen(service.Port)
				current.LastError = "检测到终端已关闭，已回收残留子进程"
			}

			switch {
			case portAlive:
				current.Status = serviceStatusRunning
			case controllerAlive || childAlive:
				current.Status = serviceStatusStarting
			default:
				if current.Mode == "terminal" && (current.ControllerPID != 0 || current.ChildPID != 0) &&
					(current.Status == serviceStatusRunning || current.Status == serviceStatusStarting) &&
					current.LastError == "" {
					current.LastError = "检测到独立终端已关闭，服务已退出"
				}
				if current.Status == "" || current.Status == serviceStatusRunning || current.Status == serviceStatusStarting {
					current.Status = serviceStatusStopped
				}
				if current.ControllerPID != 0 || current.ChildPID != 0 {
					current.ExitedAt = nowRFC3339()
				}
				current.ControllerPID = 0
				current.ChildPID = 0
			}

			current.UpdatedAt = nowRFC3339()
			state.Services[service.Name] = current
		}
		snapshot = *state
		return nil
	})
	if err != nil {
		return RuntimeState{}, err
	}
	if snapshot.Services == nil {
		snapshot.Services = map[string]ServiceState{}
	}
	return snapshot, nil
}

func processAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	if runtime.GOOS == "windows" {
		output, err := exec.Command("tasklist", "/FI", "PID eq "+strconv.Itoa(pid), "/NH").Output()
		if err != nil {
			return false
		}
		text := string(output)
		return text != "" && text != "INFO: No tasks are running which match the specified criteria.\r\n"
	}
	err := exec.Command("kill", "-0", strconv.Itoa(pid)).Run()
	return err == nil
}

func startupLabel(status string) string {
	switch status {
	case serviceStatusRunning:
		return "是"
	case serviceStatusStarting:
		return "启动中"
	default:
		return "否"
	}
}

func displayStatus(status string) string {
	switch status {
	case serviceStatusRunning:
		return "运行中"
	case serviceStatusStarting:
		return "启动中"
	case serviceStatusFailed:
		return "失败"
	case serviceStatusStopped:
		return "未启动"
	default:
		return "未知"
	}
}
