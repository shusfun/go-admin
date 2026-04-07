package models

import (
	"time"

	common "go-admin/common/models"
)

const (
	TaskTypeDeployBackend  = "deploy_backend"
	TaskTypeDeployFrontend = "deploy_frontend"
	TaskTypeDeployAll      = "deploy_all"
	TaskTypeRestart        = "restart_backend"
)

const (
	TaskStatusQueued    = "queued"
	TaskStatusRunning   = "running"
	TaskStatusSuccess   = "success"
	TaskStatusFailed    = "failed"
	TaskStatusCancelled = "cancelled"
)

type OpsTask struct {
	common.Model
	Env        string     `json:"env" gorm:"size:20;index;comment:环境标识"`
	Type       string     `json:"type" gorm:"size:30;index;comment:任务类型"`
	Status     string     `json:"status" gorm:"size:20;index;comment:任务状态"`
	Step       int        `json:"step" gorm:"comment:当前步骤序号"`
	TotalSteps int        `json:"totalSteps" gorm:"comment:总步骤数"`
	StepName   string     `json:"stepName" gorm:"size:100;comment:当前步骤名称"`
	Summary    string     `json:"summary" gorm:"size:500;comment:执行摘要"`
	ErrMsg     string     `json:"errMsg" gorm:"size:1000;comment:错误信息"`
	Suggestion string     `json:"suggestion" gorm:"size:500;comment:失败建议"`
	Commits    string     `json:"commits" gorm:"type:text;comment:本次提交JSON"`
	Log        string     `json:"log" gorm:"type:text;comment:完整日志"`
	StartedAt  *time.Time `json:"startedAt" gorm:"comment:开始时间"`
	FinishedAt *time.Time `json:"finishedAt" gorm:"comment:结束时间"`
	common.ControlBy
	common.ModelTime
}

func (*OpsTask) TableName() string {
	return "ops_task"
}

func (e *OpsTask) Generate() common.ActiveRecord {
	o := *e
	return &o
}

func (e *OpsTask) GetId() interface{} {
	return e.Id
}
