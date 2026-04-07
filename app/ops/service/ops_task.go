package service

import (
	"encoding/json"
	"errors"
	"time"

	appModels "go-admin/app/ops/models"
	"go-admin/app/ops/service/dto"
	cDto "go-admin/common/dto"

	coreService "github.com/go-admin-team/go-admin-core/sdk/service"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OpsTask struct {
	coreService.Service
}

func (e *OpsTask) HasActiveTask(env string) (bool, error) {
	var count int64
	err := e.Orm.Model(&appModels.OpsTask{}).
		Where("env = ?", env).
		Where("status IN ?", []string{appModels.TaskStatusQueued, appModels.TaskStatusRunning}).
		Count(&count).Error
	return count > 0, err
}

func (e *OpsTask) Create(userID int, req *dto.CreateTaskReq) (*appModels.OpsTask, error) {
	task := &appModels.OpsTask{
		Env:    req.Env,
		Type:   req.Type,
		Status: appModels.TaskStatusQueued,
	}
	task.SetCreateBy(userID)
	task.SetUpdateBy(userID)
	if err := e.Orm.Create(task).Error; err != nil {
		return nil, err
	}
	return task, nil
}

func (e *OpsTask) GetByID(id int) (*appModels.OpsTask, error) {
	task := &appModels.OpsTask{}
	err := e.Orm.First(task, id).Error
	if err != nil {
		return nil, err
	}
	return task, nil
}

func (e *OpsTask) GetPage(req *dto.TaskListReq, list *[]appModels.OpsTask, count *int64) error {
	db := e.Orm.Model(&appModels.OpsTask{})
	if req.Env != "" {
		db = db.Where("env = ?", req.Env)
	}
	if req.Type != "" {
		db = db.Where("type = ?", req.Type)
	}
	if req.Status != "" {
		db = db.Where("status = ?", req.Status)
	}
	return db.Scopes(
		cDto.Paginate(req.GetPageSize(), req.GetPageIndex()),
	).
		Order("id DESC").
		Find(list).Limit(-1).Offset(-1).
		Count(count).Error
}

func (e *OpsTask) GetLatestFinishedTask(env string) (*appModels.OpsTask, error) {
	task := &appModels.OpsTask{}
	err := e.Orm.Model(&appModels.OpsTask{}).
		Where("env = ?", env).
		Where("status IN ?", []string{appModels.TaskStatusSuccess, appModels.TaskStatusFailed, appModels.TaskStatusCancelled}).
		Order("finished_at DESC, id DESC").
		First(task).Error
	if err != nil {
		return nil, err
	}
	return task, nil
}

func (e *OpsTask) GetRunningTask(env string) (*appModels.OpsTask, error) {
	task := &appModels.OpsTask{}
	err := e.Orm.Model(&appModels.OpsTask{}).
		Where("env = ?", env).
		Where("status IN ?", []string{appModels.TaskStatusQueued, appModels.TaskStatusRunning}).
		Order("id DESC").
		First(task).Error
	if err != nil {
		return nil, err
	}
	return task, nil
}

func (e *OpsTask) MarkInterruptedTasksCancelled() error {
	now := time.Now()
	return e.Orm.Model(&appModels.OpsTask{}).
		Where("status IN ?", []string{appModels.TaskStatusQueued, appModels.TaskStatusRunning}).
		Updates(map[string]interface{}{
			"status":      appModels.TaskStatusCancelled,
			"summary":     "服务重启，任务已取消",
			"suggestion":  "请确认环境状态后重新发起任务",
			"finished_at": &now,
		}).Error
}

func (e *OpsTask) Cancel(id int) (*appModels.OpsTask, error) {
	task := &appModels.OpsTask{}
	now := time.Now()
	wasQueued := false
	err := e.Orm.Transaction(func(tx *gorm.DB) error {
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(task, id).Error; err != nil {
			return err
		}
		switch task.Status {
		case appModels.TaskStatusQueued:
			wasQueued = true
			updates := map[string]interface{}{
				"status":      appModels.TaskStatusCancelled,
				"summary":     "任务已取消",
				"err_msg":     "任务在排队阶段被取消",
				"suggestion":  "请确认环境状态后重新发起任务",
				"finished_at": &now,
			}
			if err := tx.Model(&appModels.OpsTask{}).Where("id = ?", id).Updates(updates).Error; err != nil {
				return err
			}
			applyTaskUpdates(task, updates)
		case appModels.TaskStatusRunning:
			return nil
		default:
			return errors.New("任务已结束，无法取消")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if wasQueued {
		_ = GetTaskManager().CancelTask(task.Id)
		GetTaskManager().UnlockEnv(task.Env, task.Id)
		broadcastTaskError(task.Id, task)
		GetTaskManager().Close(task.Id)
		return task, nil
	}

	if !GetTaskManager().CancelTask(task.Id) {
		return nil, errors.New("任务正在收尾，请稍后刷新状态")
	}
	return task, nil
}

func ToTaskListItem(task *appModels.OpsTask) dto.TaskListItem {
	return dto.TaskListItem{
		Id:         task.Id,
		Env:        task.Env,
		Type:       task.Type,
		Status:     task.Status,
		Step:       task.Step,
		TotalSteps: task.TotalSteps,
		StepName:   task.StepName,
		Summary:    task.Summary,
		ErrMsg:     task.ErrMsg,
		Suggestion: task.Suggestion,
		StartedAt:  formatTime(task.StartedAt),
		FinishedAt: formatTime(task.FinishedAt),
		CreateBy:   task.CreateBy,
		CreatedAt:  task.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  task.UpdatedAt.Format(time.RFC3339),
	}
}

func ToTaskDetail(task *appModels.OpsTask) (dto.TaskDetail, error) {
	detail := dto.TaskDetail{
		TaskListItem: ToTaskListItem(task),
		Log:          task.Log,
	}
	if task.Commits == "" {
		return detail, nil
	}
	if err := json.Unmarshal([]byte(task.Commits), &detail.Commits); err != nil {
		return dto.TaskDetail{}, err
	}
	return detail, nil
}

func formatTime(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.Format(time.RFC3339)
}

func mustGetTask(task *appModels.OpsTask, err error) (*appModels.OpsTask, error) {
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, errors.New("任务不存在")
	}
	return task, nil
}
