package actions

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-admin-team/go-admin-core/sdk/api"
	"github.com/go-admin-team/go-admin-core/sdk/pkg"
	"github.com/go-admin-team/go-admin-core/sdk/pkg/jwtauth/user"
	"github.com/go-admin-team/go-admin-core/sdk/pkg/response"

	"go-admin/common/dto"
	"go-admin/common/models"
	"go-admin/common/responsex"
)

// CreateAction 通用新增动作
func CreateAction(control dto.Control) gin.HandlerFunc {
	return func(c *gin.Context) {
		log := api.GetRequestLogger(c)
		db, err := pkg.GetOrm(c)
		if err != nil {
			log.Error(err)
			responsex.Error(c, 500, err, "数据库连接获取失败")
			return
		}

		//新增操作
		req := control.Generate()
		err = req.Bind(c)
		if err != nil {
			responsex.Error(c, http.StatusUnprocessableEntity, err, "提交的信息不完整或格式不正确，请检查后重试")
			return
		}
		var object models.ActiveRecord
		object, err = req.GenerateM()
		if err != nil {
			responsex.Error(c, 500, err, "数据准备失败，请稍后重试")
			return
		}
		object.SetCreateBy(user.GetUserId(c))
		err = db.WithContext(c).Create(object).Error
		if err != nil {
			log.Errorf("Create error: %s", err)
			responsex.Error(c, 500, err, "创建失败")
			return
		}
		response.OK(c, object.GetId(), "创建成功")
		c.Next()
	}
}
