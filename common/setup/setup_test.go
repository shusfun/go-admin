package setup

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestNeedsSetupUsesInstallLockOnly(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.yml")
	if err := os.WriteFile(configFile, []byte("settings: {}\n"), 0600); err != nil {
		t.Fatalf("write config failed: %v", err)
	}

	SetConfigPath(configFile)

	if !NeedsSetup() {
		t.Fatal("expected setup to be required when only sample config exists")
	}

	lockFile := filepath.Join(tempDir, InstallLockFile)
	if err := os.WriteFile(lockFile, []byte("installed_at=test\n"), 0600); err != nil {
		t.Fatalf("write lock failed: %v", err)
	}

	if NeedsSetup() {
		t.Fatal("expected setup to be skipped when install lock exists")
	}
}

func TestRegisterStatusRouteReflectsInstallState(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	SetConfigPath(filepath.Join(tempDir, "settings.yml"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterStatusRoute(router)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/setup/status", nil)
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("unexpected status code: %d", recorder.Code)
	}

	var payload struct {
		Code int `json:"code"`
		Data struct {
			NeedsSetup bool `json:"needs_setup"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}

	if payload.Code != 200 {
		t.Fatalf("unexpected business code: %d", payload.Code)
	}
	if !payload.Data.NeedsSetup {
		t.Fatal("expected setup status to report needs_setup=true without lock")
	}

	if err := os.WriteFile(filepath.Join(tempDir, InstallLockFile), []byte("installed_at=test\n"), 0600); err != nil {
		t.Fatalf("write lock failed: %v", err)
	}

	recorder = httptest.NewRecorder()
	request = httptest.NewRequest(http.MethodGet, "/api/v1/setup/status", nil)
	router.ServeHTTP(recorder, request)

	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal installed response failed: %v", err)
	}
	if payload.Data.NeedsSetup {
		t.Fatal("expected setup status to report needs_setup=false with lock")
	}
}
