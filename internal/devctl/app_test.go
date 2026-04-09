package devctl

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizeProjectPrefix(t *testing.T) {
	t.Parallel()

	cases := map[string]string{
		"go-admin":   "go-admin",
		"Go Admin":   "go-admin",
		"$$$":        "go-admin",
		"My_Project": "my_project",
	}

	for input, expected := range cases {
		if actual := normalizeProjectPrefix(input); actual != expected {
			t.Fatalf("normalizeProjectPrefix(%q) = %q, want %q", input, actual, expected)
		}
	}
}

func TestLoadPorts(t *testing.T) {
	t.Parallel()

	tempDir := t.TempDir()
	envPath := filepath.Join(tempDir, "dev-ports.env")
	content := "DEV_BACKEND_PORT=18123\nDEV_ADMIN_PORT=26173\n"
	if err := os.WriteFile(envPath, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	ports, err := loadPorts(envPath)
	if err != nil {
		t.Fatal(err)
	}

	if ports["DEV_BACKEND_PORT"] != 18123 {
		t.Fatalf("unexpected backend port: %d", ports["DEV_BACKEND_PORT"])
	}
	if ports["DEV_ADMIN_PORT"] != 26173 {
		t.Fatalf("unexpected admin port: %d", ports["DEV_ADMIN_PORT"])
	}
}
