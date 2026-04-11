//go:build windows

package setup

import (
	"os/exec"
	"strings"
	"syscall"
)

func execSetupRestartPlan(plan *setupRestartPlan) error {
	cmd := exec.Command("cmd", "/C", buildWindowsRestartCommand(plan))
	cmd.Env = plan.env
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return cmd.Start()
}

func buildWindowsRestartCommand(plan *setupRestartPlan) string {
	parts := make([]string, 0, len(plan.args)+9)
	parts = append(parts, "ping", "-n", "2", "127.0.0.1", ">NUL", "&&", "start", "\"\"", syscall.EscapeArg(plan.executable))
	for _, arg := range plan.args[1:] {
		parts = append(parts, syscall.EscapeArg(arg))
	}
	return strings.Join(parts, " ")
}
