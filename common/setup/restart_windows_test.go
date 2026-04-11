//go:build windows

package setup

import (
	"reflect"
	"syscall"
	"testing"
)

func TestNormalizeWindowsRestartPath(t *testing.T) {
	t.Helper()

	cases := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "普通磁盘路径保持不变",
			input: `C:\develop\go-admin\.tmp\bin\backend-dev.exe`,
			want:  `C:\develop\go-admin\.tmp\bin\backend-dev.exe`,
		},
		{
			name:  "去掉本地路径 verbatim 前缀",
			input: `\\?\C:\develop\go-admin\.tmp\bin\backend-dev.exe`,
			want:  `C:\develop\go-admin\.tmp\bin\backend-dev.exe`,
		},
		{
			name:  "去掉 UNC verbatim 前缀",
			input: `\\?\UNC\server\share\backend-dev.exe`,
			want:  `\\server\share\backend-dev.exe`,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := normalizeWindowsRestartPath(tc.input); got != tc.want {
				t.Fatalf("unexpected normalized path, got %q want %q", got, tc.want)
			}
		})
	}
}

func TestNewWindowsRestartCommandUsesDetachedProcessFlags(t *testing.T) {
	t.Helper()

	plan := &setupRestartPlan{
		executable: `\\?\C:\develop\go-admin\.tmp\bin\backend-dev.exe`,
		args: []string{
			`\\?\C:\develop\go-admin\.tmp\bin\backend-dev.exe`,
			"server",
			"-c",
			`C:/develop/go-admin/config/settings.pg.yml`,
		},
		env: []string{"A=B", "C=D"},
	}

	cmd := newWindowsRestartCommand(plan)

	if got, want := cmd.Path, `C:\develop\go-admin\.tmp\bin\backend-dev.exe`; got != want {
		t.Fatalf("unexpected command path, got %q want %q", got, want)
	}

	if got, want := cmd.Args, []string{`C:\develop\go-admin\.tmp\bin\backend-dev.exe`, "server", "-c", `C:/develop/go-admin/config/settings.pg.yml`}; !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected command args, got %#v want %#v", got, want)
	}

	if got, want := cmd.Env, plan.env; !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected command env, got %#v want %#v", got, want)
	}

	if cmd.SysProcAttr == nil {
		t.Fatal("expected SysProcAttr to be configured")
	}

	wantFlags := uint32(syscall.CREATE_NEW_PROCESS_GROUP | windowsDetachedProcess)
	if cmd.SysProcAttr.CreationFlags != wantFlags {
		t.Fatalf("unexpected creation flags, got %#x want %#x", cmd.SysProcAttr.CreationFlags, wantFlags)
	}

	if !cmd.SysProcAttr.HideWindow {
		t.Fatal("expected restart command to hide console window")
	}
}
