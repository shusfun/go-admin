package devctl

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
)

func openServiceLogFile(app *App, serviceName string) (*os.File, error) {
	logPath := filepath.Join(app.LogsDir, serviceName+".log")
	if err := ensureDir(filepath.Dir(logPath)); err != nil {
		return nil, err
	}
	return os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
}

func openWindowsTerminal(app *App, service ServiceSpec, exePath string, args []string) error {
	if wtPath, err := exec.LookPath("wt"); err == nil {
		cmdArgs := []string{"new-tab", "--title", service.Label, exePath}
		cmdArgs = append(cmdArgs, args...)
		return exec.Command(wtPath, cmdArgs...).Start()
	}

	command := fmt.Sprintf("Start-Process -FilePath %s -WorkingDirectory %s -ArgumentList %s",
		powershellQuote(exePath),
		powershellQuote(app.RepoRoot),
		powershellArgs(args),
	)
	return exec.Command("powershell.exe", "-NoProfile", "-Command", command).Start()
}

func openMacTerminal(app *App, exePath string, args []string) error {
	command := []string{"cd", shellQuote(app.RepoRoot), "&&", shellQuote(exePath)}
	for _, arg := range args {
		command = append(command, shellQuote(arg))
	}
	script := strings.Join(command, " ")
	return exec.Command(
		"osascript",
		"-e", fmt.Sprintf(`tell application "Terminal" to do script %q`, script),
		"-e", `activate application "Terminal"`,
	).Start()
}

func stopProcess(pid int) error {
	if pid <= 0 {
		return nil
	}
	if runtime.GOOS == "windows" {
		return exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/T", "/F").Run()
	}
	if err := exec.Command("kill", "-TERM", strconv.Itoa(pid)).Run(); err != nil {
		return err
	}
	return nil
}

func powershellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func powershellArgs(args []string) string {
	quoted := make([]string, 0, len(args))
	for _, arg := range args {
		quoted = append(quoted, powershellQuote(arg))
	}
	return "@(" + strings.Join(quoted, ",") + ")"
}

func shellQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}
