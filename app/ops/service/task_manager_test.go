package service

import (
	"context"
	"testing"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	appModels "go-admin/app/ops/models"
)

func TestTaskManagerBroadcastDropsSlowSubscriber(t *testing.T) {
	manager := &TaskManager{
		envLocks:    make(map[string]int),
		subs:        make(map[int]map[chan TaskEvent]struct{}),
		taskCancels: make(map[int]context.CancelFunc),
		rootCtx:     context.Background(),
	}
	ch := make(chan TaskEvent, 128)
	manager.subs[1] = map[chan TaskEvent]struct{}{
		ch: {},
	}
	for i := 0; i < cap(ch); i++ {
		ch <- TaskEvent{Type: "log"}
	}

	manager.Broadcast(1, TaskEvent{Type: "status"})

	if _, ok := manager.subs[1]; ok {
		t.Fatalf("expected slow subscriber to be removed")
	}
}

func TestTaskManagerRootContextCancellationStopsTask(t *testing.T) {
	rootCtx, cancel := context.WithCancel(context.Background())
	manager := &TaskManager{
		envLocks:    make(map[string]int),
		subs:        make(map[int]map[chan TaskEvent]struct{}),
		taskCancels: make(map[int]context.CancelFunc),
		rootCtx:     rootCtx,
	}
	done := make(chan struct{})

	manager.StartTask(1, func(ctx context.Context) {
		defer close(done)
		<-ctx.Done()
	})

	cancel()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatalf("expected task context to be cancelled by root context")
	}
	if ok := manager.Wait(2 * time.Second); !ok {
		t.Fatalf("expected task manager wait to finish")
	}
}

func TestCancelQueuedTaskReleasesEnvLock(t *testing.T) {
	originalManager := taskManager
	taskManager = &TaskManager{
		envLocks:    make(map[string]int),
		subs:        make(map[int]map[chan TaskEvent]struct{}),
		taskCancels: make(map[int]context.CancelFunc),
		rootCtx:     context.Background(),
	}
	defer func() {
		taskManager = originalManager
	}()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	if err = db.AutoMigrate(&appModels.OpsTask{}); err != nil {
		t.Fatalf("migrate ops_task failed: %v", err)
	}

	task := &appModels.OpsTask{
		Env:    "dev",
		Type:   appModels.TaskTypeDeployBackend,
		Status: appModels.TaskStatusQueued,
	}
	if err = db.Create(task).Error; err != nil {
		t.Fatalf("create task failed: %v", err)
	}
	taskManager.envLocks["dev"] = task.Id

	service := &OpsTask{}
	service.Orm = db

	cancelledTask, err := service.Cancel(task.Id)
	if err != nil {
		t.Fatalf("cancel queued task failed: %v", err)
	}
	if cancelledTask.Status != appModels.TaskStatusCancelled {
		t.Fatalf("expected cancelled status, got %s", cancelledTask.Status)
	}
	if _, ok := taskManager.envLocks["dev"]; ok {
		t.Fatalf("expected env lock to be released")
	}
}
