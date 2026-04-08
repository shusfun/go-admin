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

func TestReadSetupDefaultsUsesDevFallbacks(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.pg.yml")
	content := []byte(`
settings:
  application:
    mode: dev
  database:
    driver: postgres
    source: host=127.0.0.1 port=15432 user=dev_user password=dev_pass dbname=dev_db sslmode=disable
  locker:
    redis:
`)
	if err := os.WriteFile(configFile, content, 0600); err != nil {
		t.Fatalf("write config failed: %v", err)
	}

	SetConfigPath(configFile)

	defaults := ReadSetupDefaults()
	if defaults.Environment != "dev" {
		t.Fatalf("expected dev environment, got %q", defaults.Environment)
	}
	if defaults.Database.Host != "127.0.0.1" || defaults.Database.Port != 15432 {
		t.Fatalf("unexpected database defaults: %+v", defaults.Database)
	}
	if defaults.Database.User != "dev_user" || defaults.Database.DBName != "dev_db" {
		t.Fatalf("unexpected database credentials: %+v", defaults.Database)
	}
	if defaults.Redis.Host != "127.0.0.1" || defaults.Redis.Port != 16379 {
		t.Fatalf("expected local redis fallback, got %+v", defaults.Redis)
	}
	if defaults.Admin.Username != "admin" {
		t.Fatalf("expected default admin username, got %q", defaults.Admin.Username)
	}
}

func TestReadSetupDefaultsParsesProdSettings(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.yml")
	content := []byte(`
settings:
  application:
    mode: prod
  database:
    driver: postgres
    source: host=db.internal port=5433 user=app_user password=secret dbname=orders sslmode=require
  cache:
    redis:
      addr: redis.internal:6380
      password: redis_secret
      db: 5
`)
	if err := os.WriteFile(configFile, content, 0600); err != nil {
		t.Fatalf("write config failed: %v", err)
	}

	SetConfigPath(configFile)

	defaults := ReadSetupDefaults()
	if defaults.Environment != "prod" {
		t.Fatalf("expected prod environment, got %q", defaults.Environment)
	}
	if defaults.Database.Host != "db.internal" || defaults.Database.Port != 5433 {
		t.Fatalf("unexpected database host defaults: %+v", defaults.Database)
	}
	if defaults.Database.User != "app_user" {
		t.Fatalf("unexpected database auth defaults: %+v", defaults.Database)
	}
	if defaults.Database.DBName != "orders" || defaults.Database.SSLMode != "require" {
		t.Fatalf("unexpected database naming defaults: %+v", defaults.Database)
	}
	if defaults.Database.Password != "" {
		t.Fatalf("expected prod database password to stay empty, got %+v", defaults.Database)
	}
	if defaults.Redis.Host != "redis.internal" || defaults.Redis.Port != 6380 {
		t.Fatalf("unexpected redis host defaults: %+v", defaults.Redis)
	}
	if defaults.Redis.Password != "" || defaults.Redis.DB != 5 {
		t.Fatalf("unexpected redis auth defaults: %+v", defaults.Redis)
	}
}

func TestProjectNameNormalization(t *testing.T) {
	if got := projectNameToDevName("go-admin"); got != "go-admin-dev" {
		t.Fatalf("unexpected dev name: %s", got)
	}
	if got := projectNameToDBPrefix("go-admin"); got != "go_admin" {
		t.Fatalf("unexpected db prefix: %s", got)
	}
	if got := projectNameToDBPrefix("foo.bar-app"); got != "foo_bar_app" {
		t.Fatalf("unexpected db prefix for composite name: %s", got)
	}
}
