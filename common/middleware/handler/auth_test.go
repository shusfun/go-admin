package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	coreConfig "github.com/go-admin-team/go-admin-core/sdk/config"
	adminModels "go-admin/app/admin/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestAuthenticatorAllowsDevLoginWithoutCaptcha(t *testing.T) {
	gin.SetMode(gin.TestMode)
	previousMode := coreConfig.ApplicationConfig.Mode
	coreConfig.ApplicationConfig.Mode = "dev"
	t.Cleanup(func() {
		coreConfig.ApplicationConfig.Mode = previousMode
	})

	db := openAuthTestDB(t)
	seedAuthTestUser(t, db, "setup-admin", "admin123")

	payload, err := json.Marshal(map[string]string{
		"username": "setup-admin",
		"password": "admin123",
	})
	if err != nil {
		t.Fatalf("marshal payload failed: %v", err)
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/api/v1/login", bytes.NewReader(payload))
	ctx.Request.Header.Set("Content-Type", "application/json")
	ctx.Set("db", db)

	result, err := Authenticator(ctx)
	if err != nil {
		t.Fatalf("expected dev login without captcha to succeed, got %v", err)
	}

	authResult, ok := result.(map[string]interface{})
	if !ok {
		t.Fatalf("expected auth result map, got %T", result)
	}

	user, ok := authResult["user"].(SysUser)
	if !ok {
		t.Fatalf("expected auth result to include user, got %#v", authResult["user"])
	}
	if user.Username != "setup-admin" {
		t.Fatalf("expected username setup-admin, got %q", user.Username)
	}
}

func openAuthTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	if err := db.AutoMigrate(&adminModels.SysRole{}, &adminModels.SysUser{}); err != nil {
		t.Fatalf("migrate auth tables failed: %v", err)
	}
	return db
}

func seedAuthTestUser(t *testing.T, db *gorm.DB, username, password string) {
	t.Helper()

	role := adminModels.SysRole{
		RoleId:    1,
		RoleKey:   "admin",
		RoleName:  "管理员",
		Status:    "2",
		DataScope: "1",
	}
	if err := db.Create(&role).Error; err != nil {
		t.Fatalf("create role failed: %v", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password failed: %v", err)
	}
	user := adminModels.SysUser{
		UserId:   1,
		Username: username,
		Password: string(hashedPassword),
		RoleId:   role.RoleId,
		Status:   "2",
	}
	if err := db.Table(user.TableName()).Create(map[string]interface{}{
		"user_id":  user.UserId,
		"username": user.Username,
		"password": user.Password,
		"role_id":  user.RoleId,
		"status":   user.Status,
	}).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}
}
