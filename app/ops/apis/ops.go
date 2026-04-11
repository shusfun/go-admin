package apis

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-admin-team/go-admin-core/sdk/api"
	"github.com/go-admin-team/go-admin-core/sdk/pkg/jwtauth/user"
	"gorm.io/gorm"

	appModels "go-admin/app/ops/models"
	"go-admin/app/ops/service"
	"go-admin/app/ops/service/dto"
	ext "go-admin/config"
)

type OpsApi struct {
	api.Api
}

func (e OpsApi) GetEnvironments(c *gin.Context) {
	s := service.OpsTask{}
	err := e.MakeContext(c).
		MakeOrm().
		MakeService(&s.Service).
		Errors
	if err != nil {
		e.Error(http.StatusInternalServerError, err, userFacingApiErrorMessage(http.StatusInternalServerError))
		return
	}
	items, err := service.BuildEnvironmentItems(e.Orm, ext.ExtConfig.Ops.Environments)
	if err != nil {
		e.Error(http.StatusInternalServerError, err, "查询环境失败")
		return
	}
	e.OK(items, "查询成功")
}

func (e OpsApi) CreateTask(c *gin.Context) {
	s := service.OpsTask{}
	req := dto.CreateTaskReq{}
	err := e.MakeContext(c).
		MakeOrm().
		Bind(&req, binding.JSON).
		MakeService(&s.Service).
		Errors
	if err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	if service.GetTaskManager().IsShuttingDown() {
		err = errors.New("服务正在停止，暂不接受新任务")
		e.Error(http.StatusServiceUnavailable, err, userFacingApiErrorMessage(http.StatusServiceUnavailable))
		return
	}
	env, err := service.FindEnvironment(ext.ExtConfig.Ops.Environments, req.Env)
	if err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	if !env.Enabled {
		e.Error(http.StatusBadRequest, errors.New("环境不存在或未启用"), "环境不存在或未启用")
		return
	}
	if err = service.ValidateTaskRequest(&req, env); err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	taskID := int(time.Now().UnixNano())
	if !service.GetTaskManager().TryLockEnv(env.Key, taskID) {
		e.Error(http.StatusConflict, errors.New("该环境有正在执行的任务，请等待完成"), "该环境有正在执行的任务，请等待完成")
		return
	}
	defer func() {
		if taskID != 0 {
			service.GetTaskManager().UnlockEnv(env.Key, taskID)
		}
	}()
	hasActive, err := s.HasActiveTask(env.Key)
	if err != nil {
		e.Error(http.StatusInternalServerError, err, "查询任务状态失败")
		return
	}
	if hasActive {
		e.Error(http.StatusConflict, errors.New("该环境有正在执行的任务，请等待完成"), "该环境有正在执行的任务，请等待完成")
		return
	}
	task, err := s.Create(user.GetUserId(c), &req)
	if err != nil {
		e.Error(http.StatusInternalServerError, err, "创建任务失败")
		return
	}
	if !service.GetTaskManager().ReplaceEnvLock(env.Key, taskID, task.Id) {
		service.GetTaskManager().UnlockEnv(env.Key, taskID)
		e.Error(http.StatusConflict, errors.New("该环境有正在执行的任务，请等待完成"), "该环境有正在执行的任务，请等待完成")
		return
	}
	taskID = 0
	service.StartTaskAsync(e.Orm.Session(&gorm.Session{}), task.Id, env)
	e.OK(gin.H{"id": task.Id}, "任务已创建")
}

func (e OpsApi) CancelTask(c *gin.Context) {
	s := service.OpsTask{}
	req := dto.TaskByIDReq{}
	err := e.MakeContext(c).
		MakeOrm().
		Bind(&req, nil).
		MakeService(&s.Service).
		Errors
	if err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	task, err := s.Cancel(req.Id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			e.Error(http.StatusNotFound, err, "任务不存在")
			return
		}
		if err.Error() == "任务已结束，无法取消" {
			e.Error(http.StatusConflict, err, err.Error())
			return
		}
		e.Error(http.StatusInternalServerError, err, "取消任务失败")
		return
	}
	e.OK(gin.H{"id": task.Id, "status": task.Status}, "任务取消请求已提交")
}

func (e OpsApi) GetTaskList(c *gin.Context) {
	s := service.OpsTask{}
	req := dto.TaskListReq{}
	err := e.MakeContext(c).
		MakeOrm().
		Bind(&req).
		MakeService(&s.Service).
		Errors
	if err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	list := make([]appModels.OpsTask, 0)
	var count int64
	if err = s.GetPage(&req, &list, &count); err != nil {
		e.Error(http.StatusInternalServerError, err, "查询任务失败")
		return
	}
	items := make([]dto.TaskListItem, 0, len(list))
	for i := range list {
		items = append(items, service.ToTaskListItem(&list[i]))
	}
	e.PageOK(items, int(count), req.GetPageIndex(), req.GetPageSize(), "查询成功")
}

func (e OpsApi) GetTask(c *gin.Context) {
	s := service.OpsTask{}
	req := dto.TaskByIDReq{}
	err := e.MakeContext(c).
		MakeOrm().
		Bind(&req, nil).
		MakeService(&s.Service).
		Errors
	if err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	task, err := s.GetByID(req.Id)
	if err != nil {
		e.Error(http.StatusNotFound, err, "任务不存在")
		return
	}
	detail, err := service.ToTaskDetail(task)
	if err != nil {
		e.Error(http.StatusInternalServerError, err, "解析任务详情失败")
		return
	}
	e.OK(detail, "查询成功")
}

func (e OpsApi) Stream(c *gin.Context) {
	s := service.OpsTask{}
	req := dto.TaskByIDReq{}
	err := e.MakeContext(c).
		MakeOrm().
		Bind(&req, nil).
		MakeService(&s.Service).
		Errors
	if err != nil {
		e.Error(http.StatusBadRequest, err, userFacingApiErrorMessage(http.StatusBadRequest))
		return
	}
	task, err := s.GetByID(req.Id)
	if err != nil {
		e.Error(http.StatusNotFound, err, "任务不存在")
		return
	}
	lastOffset := 0
	if raw := c.Query("lastLogOffset"); raw != "" {
		lastOffset, _ = strconv.Atoi(raw)
	} else if raw = c.GetHeader("Last-Event-ID"); raw != "" {
		lastOffset, _ = strconv.Atoi(raw)
	}
	service.StreamTask(c, e.Orm, task, lastOffset)
}
