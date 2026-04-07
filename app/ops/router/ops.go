package router

import (
	"github.com/gin-gonic/gin"
	jwt "github.com/go-admin-team/go-admin-core/sdk/pkg/jwtauth"
	"go-admin/app/ops/apis"
	"go-admin/common/middleware"
)

func init() {
	routerCheckRole = append(routerCheckRole, registerOpsRouter)
}

func registerOpsRouter(v1 *gin.RouterGroup, authMiddleware *jwt.GinJWTMiddleware) {
	api := apis.OpsApi{}
	r := v1.Group("/ops").Use(authMiddleware.MiddlewareFunc()).Use(middleware.AuthCheckRole())
	{
		r.GET("/environments", api.GetEnvironments)
		r.POST("/tasks", api.CreateTask)
		r.GET("/tasks", api.GetTaskList)
		r.GET("/tasks/:id", api.GetTask)
		r.POST("/tasks/:id/cancel", api.CancelTask)
		r.GET("/tasks/:id/stream", api.Stream)
	}
}
