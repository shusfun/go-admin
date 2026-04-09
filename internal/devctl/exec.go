package devctl

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
)

type RunOptions struct {
	Dir    string
	Env    map[string]string
	Stdout io.Writer
	Stderr io.Writer
	Stdin  io.Reader
}

func (a *App) runCommand(name string, args []string, opts RunOptions) error {
	cmd := exec.Command(name, args...)
	cmd.Dir = opts.Dir
	if cmd.Dir == "" {
		cmd.Dir = a.RepoRoot
	}
	cmd.Env = os.Environ()
	for key, value := range opts.Env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
	}
	if opts.Stdout != nil {
		cmd.Stdout = opts.Stdout
	} else {
		cmd.Stdout = os.Stdout
	}
	if opts.Stderr != nil {
		cmd.Stderr = opts.Stderr
	} else {
		cmd.Stderr = os.Stderr
	}
	if opts.Stdin != nil {
		cmd.Stdin = opts.Stdin
	}
	return cmd.Run()
}

func (a *App) captureCommand(name string, args []string, opts RunOptions) (string, error) {
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	if opts.Stdout == nil {
		opts.Stdout = &stdout
	}
	if opts.Stderr == nil {
		opts.Stderr = &stderr
	}
	err := a.runCommand(name, args, opts)
	output := strings.TrimSpace(stdout.String())
	if err != nil {
		errText := strings.TrimSpace(stderr.String())
		if errText != "" {
			return output, fmt.Errorf("%w: %s", err, errText)
		}
		return output, err
	}
	return output, nil
}
