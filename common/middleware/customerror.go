package middleware

import (
	"fmt"
	"net/http"
	"runtime"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-admin-team/go-admin-core/sdk/config"
)

func shouldExposePanicDetail() bool {
	mode := strings.ToLower(strings.TrimSpace(config.ApplicationConfig.Mode))
	return mode == "" || mode == "dev" || mode == "test"
}

func buildPanicPayload(code int, message string) gin.H {
	payload := gin.H{
		"code": code,
		"msg":  message,
	}
	if shouldExposePanicDetail() {
		payload["debug"] = gin.H{
			"error": message,
			"stack": string(debug.Stack()),
		}
	}
	return payload
}

func CustomError(c *gin.Context) {
	defer func() {
		if err := recover(); err != nil {

			if c.IsAborted() {
				c.Status(200)
			}
			switch errStr := err.(type) {
			case string:
				p := strings.Split(errStr, "#")
				if len(p) == 3 && p[0] == "CustomError" {
					statusCode, e := strconv.Atoi(p[1])
					if e != nil {
						break
					}
					c.Status(statusCode)
					fmt.Println(
						time.Now().Format("2006-01-02 15:04:05"),
						"[ERROR]",
						c.Request.Method,
						c.Request.URL,
						statusCode,
						c.Request.RequestURI,
						c.ClientIP(),
						p[2],
					)
					c.JSON(http.StatusOK, buildPanicPayload(statusCode, p[2]))
				} else {
					c.JSON(http.StatusOK, buildPanicPayload(500, errStr))
				}
			case error:
				c.JSON(http.StatusOK, buildPanicPayload(500, errStr.Error()))
			case runtime.Error:
				c.JSON(http.StatusOK, buildPanicPayload(500, errStr.Error()))
			default:
				panic(err)
			}
		}
	}()
	c.Next()
}
