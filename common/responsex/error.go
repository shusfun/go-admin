package responsex

import (
	"fmt"
	"runtime/debug"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-admin-team/go-admin-core/sdk/config"
	"github.com/go-admin-team/go-admin-core/sdk/pkg"
	"github.com/go-admin-team/go-admin-core/sdk/pkg/response"
)

func shouldExposeDebugError() bool {
	mode := strings.ToLower(strings.TrimSpace(config.ApplicationConfig.Mode))
	return mode == "" || mode == pkg.ModeDev.String() || mode == pkg.ModeTest.String()
}

func buildDebugErrorPayload(code int, err error, msg string) gin.H {
	userMsg := strings.Join(strings.Fields(strings.TrimSpace(msg)), " ")
	if userMsg == "" && err != nil {
		userMsg = err.Error()
	}
	if userMsg == "" {
		userMsg = "请求未完成，请稍后重试"
	}

	payload := gin.H{
		"code": code,
		"msg":  userMsg,
	}
	if err == nil {
		return payload
	}

	stack := strings.TrimSpace(fmt.Sprintf("%+v", err))
	if stack == "" || stack == err.Error() {
		stack = strings.TrimSpace(string(debug.Stack()))
	}

	payload["debug"] = gin.H{
		"error": err.Error(),
		"stack": stack,
	}
	return payload
}

func Error(c *gin.Context, code int, err error, msg string) {
	if shouldExposeDebugError() && err != nil {
		response.Custum(c, buildDebugErrorPayload(code, err, msg))
		return
	}
	response.Error(c, code, err, msg)
}
