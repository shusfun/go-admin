//go:build windows

package setup

import (
	"os/exec"
	"strings"
	"syscall"
)

const windowsDetachedProcess = 0x00000008

func execSetupRestartPlan(plan *setupRestartPlan) error {
	cmd := newWindowsRestartCommand(plan)
	return cmd.Start()
}

func newWindowsRestartCommand(plan *setupRestartPlan) *exec.Cmd {
	executable := normalizeWindowsRestartPath(plan.executable)
	args := append([]string{}, plan.args[1:]...)

	cmd := exec.Command(executable, args...)
	cmd.Env = plan.env
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP | windowsDetachedProcess,
		HideWindow:    true,
	}
	return cmd
}

// 去掉 Windows verbatim path 前缀，避免 shell / CreateProcess 在某些场景下把路径误判成 UNC。
func normalizeWindowsRestartPath(value string) string {
	switch {
	case strings.HasPrefix(value, `\\?\UNC\`):
		return `\\` + strings.TrimPrefix(value, `\\?\UNC\`)
	case strings.HasPrefix(value, `\\?\`):
		return strings.TrimPrefix(value, `\\?\`)
	default:
		return value
	}
}
