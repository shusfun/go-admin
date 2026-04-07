package router

import (
	"github.com/gin-gonic/gin"
	jwt "github.com/go-admin-team/go-admin-core/sdk/pkg/jwtauth"
	"go-admin/common/routerx"
)

var (
	routerNoCheckRole = make([]func(*gin.RouterGroup), 0)
	routerCheckRole   = make([]func(v1 *gin.RouterGroup, authMiddleware *jwt.GinJWTMiddleware), 0)
)

func initRouter(r *gin.Engine, authMiddleware *jwt.GinJWTMiddleware) *gin.Engine {
	noCheckRoleRouter(r)
	checkRoleRouter(r, authMiddleware)
	return r
}

func noCheckRoleRouter(r *gin.Engine) {
	routerx.RegisterGroups(r, routerx.AdminPrefixes(), func(v1 *gin.RouterGroup) {
		for _, f := range routerNoCheckRole {
			f(v1)
		}
	})
}

func checkRoleRouter(r *gin.Engine, authMiddleware *jwt.GinJWTMiddleware) {
	routerx.RegisterGroups(r, routerx.AdminPrefixes(), func(v1 *gin.RouterGroup) {
		for _, f := range routerCheckRole {
			f(v1, authMiddleware)
		}
	})
}
