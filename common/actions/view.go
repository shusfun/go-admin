package actions

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	log "github.com/go-admin-team/go-admin-core/logger"
	"github.com/go-admin-team/go-admin-core/sdk/pkg"
	"github.com/go-admin-team/go-admin-core/sdk/pkg/response"
	"gorm.io/gorm"

	"go-admin/common/dto"
	"go-admin/common/models"
	"go-admin/common/responsex"
)

// ViewAction 通用详情动作
func ViewAction(control dto.Control, f func() interface{}) gin.HandlerFunc {
	return func(c *gin.Context) {
		db, err := pkg.GetOrm(c)
		if err != nil {
			log.Error(err)
			responsex.Error(c, 500, err, "数据库连接获取失败")
			return
		}

		msgID := pkg.GenerateMsgIDFromContext(c)
		//查看详情
		req := control.Generate()
		err = req.Bind(c)
		if err != nil {
			responsex.Error(c, http.StatusUnprocessableEntity, err, "参数验证失败")
			return
		}
		var object models.ActiveRecord
		object, err = req.GenerateM()
		if err != nil {
			responsex.Error(c, 500, err, "数据准备失败，请稍后重试")
			return
		}

		var rsp interface{}
		if f != nil {
			rsp = f()
		} else {
			rsp, _ = req.GenerateM()
		}

		//数据权限检查
		p := GetPermissionFromContext(c)

		err = db.Model(object).WithContext(c).Scopes(
			Permission(object.TableName(), p),
		).Where(req.GetId()).First(rsp).Error

		if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
			response.Error(c, http.StatusNotFound, nil, "查看对象不存在或无权查看")
			return
		}
		if err != nil {
			log.Errorf("MsgID[%s] View error: %s", msgID, err)
			responsex.Error(c, 500, err, "查看失败")
			return
		}
		response.OK(c, rsp, "查询成功")
		c.Next()
	}
}
