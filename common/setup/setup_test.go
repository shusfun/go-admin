package setup

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
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

func withRepoProfileReader(t *testing.T, reader func() (*repoProfile, error)) {
	t.Helper()

	previous := repoProfileReader
	repoProfileReader = reader
	t.Cleanup(func() {
		repoProfileReader = previous
	})
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

func TestInstallRejectsInvalidEnvironment(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	SetConfigPath(filepath.Join(tempDir, "settings.yml"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router)

	body := map[string]interface{}{
		"environment": "staging",
		"database": map[string]interface{}{
			"host":     "127.0.0.1",
			"port":     5432,
			"user":     "postgres",
			"password": "",
			"dbname":   "go_admin",
		},
		"admin": map[string]interface{}{
			"username": "admin",
			"password": "admin123",
			"email":    "",
			"phone":    "",
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal request failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/setup/install", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("unexpected status code: %d", recorder.Code)
	}
	if responseBody := recorder.Body.String(); !bytes.Contains([]byte(responseBody), []byte("安装环境无效")) {
		t.Fatalf("unexpected response body: %s", responseBody)
	}
}

func TestInstallSuccessSchedulesRestartAndPassesValidatedEnvironment(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	previousInstallSetup := installSetup
	previousScheduleSetupRestart := scheduleSetupRestart
	t.Cleanup(func() {
		SetConfigPath(previous)
		installSetup = previousInstallSetup
		scheduleSetupRestart = previousScheduleSetupRestart
	})

	tempDir := t.TempDir()
	SetConfigPath(filepath.Join(tempDir, "settings.yml"))

	var captured *SetupConfig
	restartScheduled := false
	installSetup = func(cfg *SetupConfig) error {
		cloned := *cfg
		captured = &cloned
		return nil
	}
	scheduleSetupRestart = func() error {
		restartScheduled = true
		return nil
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	RegisterRoutes(router)

	body := map[string]interface{}{
		"environment": "test",
		"database": map[string]interface{}{
			"host":     "127.0.0.1",
			"port":     5432,
			"user":     "postgres",
			"password": "secret",
			"dbname":   "go_admin_test",
		},
		"admin": map[string]interface{}{
			"username": "admin",
			"password": "admin123",
			"email":    "admin@example.com",
			"phone":    "13800138000",
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal request failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/setup/install", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("unexpected status code: %d, body=%s", recorder.Code, recorder.Body.String())
	}
	if !restartScheduled {
		t.Fatal("expected restart to be scheduled after successful install")
	}
	if captured == nil {
		t.Fatal("expected install setup to receive validated config")
	}
	if captured.Environment != "test" {
		t.Fatalf("expected environment=test, got %q", captured.Environment)
	}
	if captured.Database.SSLMode != "disable" {
		t.Fatalf("expected sslmode=disable, got %q", captured.Database.SSLMode)
	}
}

func TestScheduleSetupRestartExitsCurrentProcessAfterExecuteReturns(t *testing.T) {
	t.Helper()

	previousPrepareSetupRestart := prepareSetupRestart
	previousExecuteSetupRestart := executeSetupRestart
	previousSleepBeforeSetupRestart := sleepBeforeSetupRestart
	previousExitSetupProcess := exitSetupProcess
	t.Cleanup(func() {
		prepareSetupRestart = previousPrepareSetupRestart
		executeSetupRestart = previousExecuteSetupRestart
		sleepBeforeSetupRestart = previousSleepBeforeSetupRestart
		exitSetupProcess = previousExitSetupProcess
	})

	want := &setupRestartPlan{
		executable: "/tmp/backend-dev",
		args:       []string{"/tmp/backend-dev", "server", "-c", "config/settings.pg.yml"},
		env:        []string{"A=B"},
	}
	prepareSetupRestart = func() (*setupRestartPlan, error) {
		return want, nil
	}
	sleepBeforeSetupRestart = func() {}

	triggered := make(chan *setupRestartPlan, 1)
	exitCodes := make(chan int, 1)
	executeSetupRestart = func(plan *setupRestartPlan) error {
		triggered <- plan
		return nil
	}
	exitSetupProcess = func(code int) {
		exitCodes <- code
	}

	if err := scheduleSetupRestart(); err != nil {
		t.Fatalf("schedule setup restart failed: %v", err)
	}

	select {
	case got := <-triggered:
		if got.executable != want.executable {
			t.Fatalf("unexpected executable: %s", got.executable)
		}
	case <-time.After(time.Second):
		t.Fatal("expected restart executor to be triggered")
	}

	select {
	case code := <-exitCodes:
		if code != 0 {
			t.Fatalf("expected process exit code 0, got %d", code)
		}
	case <-time.After(time.Second):
		t.Fatal("expected current setup process to exit after restart scheduling")
	}
}

func TestTriggerSetupRestartWritesReloadMarkerForAirStrategy(t *testing.T) {
	t.Helper()

	previousPrepareSetupRestart := prepareSetupRestart
	previousExecuteSetupRestart := executeSetupRestart
	previousScheduleSetupRestart := scheduleSetupRestart
	t.Cleanup(func() {
		prepareSetupRestart = previousPrepareSetupRestart
		executeSetupRestart = previousExecuteSetupRestart
		scheduleSetupRestart = previousScheduleSetupRestart
	})

	want := &setupRestartPlan{
		executable: "/tmp/backend-dev",
		args:       []string{"/tmp/backend-dev", "server", "-c", "config/settings.pg.yml"},
		env:        []string{"A=B"},
	}
	prepareSetupRestart = func() (*setupRestartPlan, error) {
		return want, nil
	}
	triggered := make(chan *setupRestartPlan, 1)
	executeSetupRestart = func(plan *setupRestartPlan) error {
		triggered <- plan
		return nil
	}
	scheduleSetupRestart = func() error {
		plan, err := prepareSetupRestart()
		if err != nil {
			return err
		}
		go func() {
			if err := executeSetupRestart(plan); err != nil {
				t.Errorf("unexpected restart error: %v", err)
			}
		}()
		return nil
	}

	if err := scheduleSetupRestart(); err != nil {
		t.Fatalf("schedule setup restart failed: %v", err)
	}

	select {
	case got := <-triggered:
		if got.executable != want.executable {
			t.Fatalf("unexpected executable: %s", got.executable)
		}
		if strings.Join(got.args, " ") != strings.Join(want.args, " ") {
			t.Fatalf("unexpected args: %v", got.args)
		}
	case <-time.After(time.Second):
		t.Fatal("expected restart executor to be triggered")
	}
}

func TestReadSetupDefaultsUsesDevFallbacks(t *testing.T) {
	t.Helper()
	withRepoProfileReader(t, func() (*repoProfile, error) {
		return nil, os.ErrNotExist
	})

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
	if defaults.Admin.Username != "admin" {
		t.Fatalf("expected default admin username, got %q", defaults.Admin.Username)
	}
}

func TestReadSetupDefaultsUsesProdFallbacksWithoutConfigOrProfile(t *testing.T) {
	t.Helper()
	withRepoProfileReader(t, func() (*repoProfile, error) {
		return nil, os.ErrNotExist
	})

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	SetConfigPath(filepath.Join(tempDir, "settings.yml"))

	defaults := ReadSetupDefaults()
	if defaults.Environment != "prod" {
		t.Fatalf("expected prod fallback environment, got %q", defaults.Environment)
	}
	if defaults.Database.Host != "postgres" || defaults.Database.Port != 5432 {
		t.Fatalf("unexpected prod database defaults: %+v", defaults.Database)
	}
	if defaults.Database.Password != "" {
		t.Fatalf("expected prod password to stay empty, got %+v", defaults.Database)
	}
}

func TestReadSetupDefaultsParsesProdSettings(t *testing.T) {
	t.Helper()
	withRepoProfileReader(t, func() (*repoProfile, error) {
		return nil, os.ErrNotExist
	})

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
}

func TestReadSetupDefaultsPrefersRepoInfraWhenNeedsSetup(t *testing.T) {
	t.Helper()
	withRepoProfileReader(t, func() (*repoProfile, error) {
		profile := &repoProfile{}
		profile.Infra.Provider = "global"
		profile.Infra.Postgres.Host = "127.0.0.1"
		profile.Infra.Postgres.Port = 5432
		return profile, nil
	})

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.pg.yml")
	content := []byte(`
settings:
  application:
    mode: prod
  database:
    driver: postgres
    source: host=127.0.0.1 port=15432 user=dev_user password=dev_pass dbname=dev_db sslmode=disable
`)
	if err := os.WriteFile(configFile, content, 0600); err != nil {
		t.Fatalf("write config failed: %v", err)
	}

	SetConfigPath(configFile)

	defaults := ReadSetupDefaults()
	if defaults.Environment != "dev" {
		t.Fatalf("expected local infra setup to force dev defaults, got %q", defaults.Environment)
	}
	if defaults.Database.Host != "127.0.0.1" || defaults.Database.Port != 5432 {
		t.Fatalf("expected repo infra postgres defaults, got %+v", defaults.Database)
	}
	if defaults.Database.User != "go_admin_dev" || defaults.Database.DBName != "go_admin_dev" {
		t.Fatalf("expected project-based database defaults, got %+v", defaults.Database)
	}
	if defaults.Database.Password != "go_admin_dev" {
		t.Fatalf("expected local database password to be prefilled, got %+v", defaults.Database)
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

func TestWriteSettingsYmlEnablesStartupAutoMigrate(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.pg.yml")
	SetConfigPath(configFile)

	cfg := &SetupConfig{
		Environment: "dev",
		Database: DatabaseConfig{
			Host:     "127.0.0.1",
			Port:     5432,
			User:     "go_admin_dev",
			Password: "go_admin_dev",
			DBName:   "go_admin_dev",
			SSLMode:  "disable",
		},
	}

	if err := writeSettingsYml(cfg); err != nil {
		t.Fatalf("write settings failed: %v", err)
	}

	content, err := os.ReadFile(configFile)
	if err != nil {
		t.Fatalf("read settings failed: %v", err)
	}

	var payload map[string]interface{}
	if err := yaml.Unmarshal(content, &payload); err != nil {
		t.Fatalf("unmarshal settings failed: %v", err)
	}

	settings := payload["settings"].(map[string]interface{})
	extend := settings["extend"].(map[string]interface{})
	runtime := extend["runtime"].(map[string]interface{})
	if enabled, ok := runtime["autoMigrateOnStart"].(bool); !ok || !enabled {
		t.Fatalf("expected autoMigrateOnStart=true, got %#v", runtime["autoMigrateOnStart"])
	}
}

func TestWriteSettingsYmlDisablesStartupAutoMigrateForProd(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	t.Cleanup(func() {
		SetConfigPath(previous)
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.yml")
	SetConfigPath(configFile)

	cfg := &SetupConfig{
		Environment: "prod",
		Database: DatabaseConfig{
			Host:     "db.internal",
			Port:     5432,
			User:     "go_admin",
			Password: "secret",
			DBName:   "go_admin",
			SSLMode:  "disable",
		},
	}

	if err := writeSettingsYml(cfg); err != nil {
		t.Fatalf("write settings failed: %v", err)
	}

	content, err := os.ReadFile(configFile)
	if err != nil {
		t.Fatalf("read settings failed: %v", err)
	}

	var payload map[string]interface{}
	if err := yaml.Unmarshal(content, &payload); err != nil {
		t.Fatalf("unmarshal settings failed: %v", err)
	}

	settings := payload["settings"].(map[string]interface{})
	application := settings["application"].(map[string]interface{})
	if mode, ok := application["mode"].(string); !ok || mode != "prod" {
		t.Fatalf("expected application.mode=prod, got %#v", application["mode"])
	}

	extend := settings["extend"].(map[string]interface{})
	runtime := extend["runtime"].(map[string]interface{})
	if enabled, ok := runtime["autoMigrateOnStart"].(bool); !ok || enabled {
		t.Fatalf("expected autoMigrateOnStart=false, got %#v", runtime["autoMigrateOnStart"])
	}
}

func TestInstallWritesSettingsAndLockForTestEnvironment(t *testing.T) {
	t.Helper()

	previous := GetConfigPath()
	previousRunSetupConnectionTest := runSetupConnectionTest
	previousRunSetupDatabaseInitialization := runSetupDatabaseInitialization
	previousRunSetupAdminCreation := runSetupAdminCreation
	t.Cleanup(func() {
		SetConfigPath(previous)
		runSetupConnectionTest = previousRunSetupConnectionTest
		runSetupDatabaseInitialization = previousRunSetupDatabaseInitialization
		runSetupAdminCreation = previousRunSetupAdminCreation
	})

	tempDir := t.TempDir()
	configFile := filepath.Join(tempDir, "settings.test.yml")
	SetConfigPath(configFile)

	runSetupConnectionTest = func(cfg *DatabaseConfig) error {
		return nil
	}
	runSetupDatabaseInitialization = func(cfg *SetupConfig) error {
		return nil
	}
	runSetupAdminCreation = func(cfg *SetupConfig) error {
		return nil
	}

	cfg := &SetupConfig{
		Environment: "test",
		Database: DatabaseConfig{
			Host:     "127.0.0.1",
			Port:     5432,
			User:     "go_admin_test",
			Password: "go_admin_test",
			DBName:   "go_admin_test",
			SSLMode:  "disable",
		},
		Admin: AdminConfig{
			Username: "admin",
			Password: "admin123",
			Email:    "admin@example.com",
			Phone:    "13800138000",
		},
	}

	if err := Install(cfg); err != nil {
		t.Fatalf("install failed: %v", err)
	}

	lockFile := filepath.Join(tempDir, InstallLockFile)
	if _, err := os.Stat(lockFile); err != nil {
		t.Fatalf("expected install lock to exist: %v", err)
	}

	content, err := os.ReadFile(configFile)
	if err != nil {
		t.Fatalf("read settings failed: %v", err)
	}

	var payload map[string]interface{}
	if err := yaml.Unmarshal(content, &payload); err != nil {
		t.Fatalf("unmarshal settings failed: %v", err)
	}

	settings := payload["settings"].(map[string]interface{})
	application := settings["application"].(map[string]interface{})
	if mode, ok := application["mode"].(string); !ok || mode != "test" {
		t.Fatalf("expected application.mode=test, got %#v", application["mode"])
	}

	extend := settings["extend"].(map[string]interface{})
	runtime := extend["runtime"].(map[string]interface{})
	if enabled, ok := runtime["autoMigrateOnStart"].(bool); !ok || !enabled {
		t.Fatalf("expected autoMigrateOnStart=true for test env, got %#v", runtime["autoMigrateOnStart"])
	}
}

func TestInstallWrapsConnectionError(t *testing.T) {
	t.Helper()

	previousRunSetupConnectionTest := runSetupConnectionTest
	t.Cleanup(func() {
		runSetupConnectionTest = previousRunSetupConnectionTest
	})

	runSetupConnectionTest = func(cfg *DatabaseConfig) error {
		return errors.New("dial tcp refused")
	}

	err := Install(&SetupConfig{})
	if err == nil {
		t.Fatal("expected install to fail when connection test fails")
	}
	if got := err.Error(); got != "数据库连接失败: dial tcp refused" {
		t.Fatalf("unexpected error: %s", got)
	}
}
