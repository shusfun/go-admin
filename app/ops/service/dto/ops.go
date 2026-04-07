package dto

import (
	"go-admin/common/dto"
)

type CreateTaskReq struct {
	Env         string `json:"env" binding:"required"`
	Type        string `json:"type" binding:"required"`
	ConfirmName string `json:"confirmName"`
}

type TaskListReq struct {
	dto.Pagination
	Env    string `form:"env"`
	Type   string `form:"type"`
	Status string `form:"status"`
}

type TaskByIDReq struct {
	Id int `uri:"id" binding:"required"`
}

type CommitInfo struct {
	Hash    string `json:"hash"`
	Message string `json:"message"`
}

type RepoPendingCommits struct {
	Count   int          `json:"count"`
	Recent  []CommitInfo `json:"recent"`
	Commits []CommitInfo `json:"commits"`
}

type PendingCommits struct {
	Backend  RepoPendingCommits `json:"backend"`
	Frontend RepoPendingCommits `json:"frontend"`
}

type LastDeploy struct {
	Id         int    `json:"id"`
	Type       string `json:"type"`
	Status     string `json:"status"`
	FinishedAt string `json:"finishedAt"`
}

type RunningTask struct {
	Id         int    `json:"id"`
	Type       string `json:"type"`
	Status     string `json:"status"`
	Step       int    `json:"step"`
	TotalSteps int    `json:"totalSteps"`
	StepName   string `json:"stepName"`
}

type EnvironmentItem struct {
	Key            string         `json:"key"`
	Name           string         `json:"name"`
	Enabled        bool           `json:"enabled"`
	Domain         string         `json:"domain"`
	ConfirmName    bool           `json:"confirmName"`
	Status         string         `json:"status"`
	LastDeploy     *LastDeploy    `json:"lastDeploy"`
	PendingCommits PendingCommits `json:"pendingCommits"`
	RunningTask    *RunningTask   `json:"runningTask"`
	Actions        []string       `json:"actions"`
}

type TaskListItem struct {
	Id         int    `json:"id"`
	Env        string `json:"env"`
	Type       string `json:"type"`
	Status     string `json:"status"`
	Step       int    `json:"step"`
	TotalSteps int    `json:"totalSteps"`
	StepName   string `json:"stepName"`
	Summary    string `json:"summary"`
	ErrMsg     string `json:"errMsg"`
	Suggestion string `json:"suggestion"`
	StartedAt  string `json:"startedAt"`
	FinishedAt string `json:"finishedAt"`
	CreateBy   int    `json:"createBy"`
	CreatedAt  string `json:"createdAt"`
	UpdatedAt  string `json:"updatedAt"`
}

type TaskCommits struct {
	Backend  []CommitInfo `json:"backend"`
	Frontend []CommitInfo `json:"frontend"`
}

type TaskDetail struct {
	TaskListItem
	Log     string      `json:"log"`
	Commits TaskCommits `json:"commits"`
}
