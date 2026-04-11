//go:build !windows

package setup

import "syscall"

func execSetupRestartPlan(plan *setupRestartPlan) error {
	return syscall.Exec(plan.executable, plan.args, plan.env)
}
