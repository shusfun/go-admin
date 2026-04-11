package apis

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/go-admin-team/go-admin-core/sdk/config"
)

func TestApiErrorExposeDebugPayloadInDev(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalMode := config.ApplicationConfig.Mode
	config.ApplicationConfig.Mode = "dev"
	defer func() {
		config.ApplicationConfig.Mode = originalMode
	}()

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodPost, "/admin-api/v1/role", nil)

	api := &Api{Context: ctx}
	api.Error(500, errors.New("duplicate key"), "创建角色失败")

	if recorder.Code != 200 {
		t.Fatalf("expected http status 200, got %d", recorder.Code)
	}

	var payload struct {
		Code  int    `json:"code"`
		Msg   string `json:"msg"`
		Debug struct {
			Error string `json:"error"`
			Stack string `json:"stack"`
		} `json:"debug"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	if payload.Code != 500 {
		t.Fatalf("expected code 500, got %d", payload.Code)
	}
	if payload.Msg != "创建角色失败" {
		t.Fatalf("expected msg to keep developer message, got %q", payload.Msg)
	}
	if payload.Debug.Error != "duplicate key" {
		t.Fatalf("expected debug.error to expose raw error, got %q", payload.Debug.Error)
	}
	if payload.Debug.Stack == "" {
		t.Fatal("expected debug.stack to be present in dev mode")
	}
}
