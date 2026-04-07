package router

import (
	"os"

	"github.com/gin-gonic/gin"
	log "github.com/go-admin-team/go-admin-core/logger"
	"github.com/go-admin-team/go-admin-core/sdk"
	"go-admin/app/ops/service"
	common "go-admin/common/middleware"
)

func InitRouter() {
	var r *gin.Engine
	h := sdk.Runtime.GetEngine()
	if h == nil {
		log.Fatal("not found engine...")
		os.Exit(-1)
	}
	switch h.(type) {
	case *gin.Engine:
		r = h.(*gin.Engine)
	default:
		log.Fatal("not support other engine")
		os.Exit(-1)
	}
	authMiddleware, err := common.AuthInit()
	if err != nil {
		log.Fatalf("JWT Init Error, %s", err.Error())
	}
	if db := sdk.Runtime.GetDbByKey("*"); db != nil {
		s := service.OpsTask{}
		s.Orm = db
		if err = s.MarkInterruptedTasksCancelled(); err != nil {
			log.Warnf("ops task recover error: %s", err.Error())
		}
	}
	initRouter(r, authMiddleware)
}
