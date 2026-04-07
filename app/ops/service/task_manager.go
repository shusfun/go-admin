package service

import (
	"context"
	"sync"
	"time"

	log "github.com/go-admin-team/go-admin-core/logger"
)

type TaskEvent struct {
	Type string
	Data interface{}
}

type TaskManager struct {
	envLocks     map[string]int
	subs         map[int]map[chan TaskEvent]struct{}
	taskCancels  map[int]context.CancelFunc
	rootCtx      context.Context
	shuttingDown bool
	mu           sync.RWMutex
	wg           sync.WaitGroup
}

var taskManager = &TaskManager{
	envLocks:    make(map[string]int),
	subs:        make(map[int]map[chan TaskEvent]struct{}),
	taskCancels: make(map[int]context.CancelFunc),
	rootCtx:     context.Background(),
}

func GetTaskManager() *TaskManager {
	return taskManager
}

func (m *TaskManager) SetRootContext(ctx context.Context) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if ctx == nil {
		ctx = context.Background()
	}
	m.rootCtx = ctx
}

func (m *TaskManager) IsShuttingDown() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.shuttingDown
}

func (m *TaskManager) BeginShutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.shuttingDown = true
}

func (m *TaskManager) TryLockEnv(env string, taskID int) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.envLocks[env]; ok {
		return false
	}
	m.envLocks[env] = taskID
	return true
}

func (m *TaskManager) UnlockEnv(env string, taskID int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if current, ok := m.envLocks[env]; ok && current == taskID {
		delete(m.envLocks, env)
	}
}

func (m *TaskManager) ReplaceEnvLock(env string, oldTaskID, newTaskID int) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if current, ok := m.envLocks[env]; ok && current == oldTaskID {
		m.envLocks[env] = newTaskID
		return true
	}
	return false
}

func (m *TaskManager) Subscribe(taskID int) chan TaskEvent {
	m.mu.Lock()
	defer m.mu.Unlock()
	ch := make(chan TaskEvent, 128)
	if _, ok := m.subs[taskID]; !ok {
		m.subs[taskID] = make(map[chan TaskEvent]struct{})
	}
	m.subs[taskID][ch] = struct{}{}
	return ch
}

func (m *TaskManager) Unsubscribe(taskID int, ch chan TaskEvent) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if subs, ok := m.subs[taskID]; ok {
		if _, exists := subs[ch]; exists {
			delete(subs, ch)
			close(ch)
		}
		if len(subs) == 0 {
			delete(m.subs, taskID)
		}
	}
}

func (m *TaskManager) Broadcast(taskID int, event TaskEvent) {
	m.mu.Lock()
	defer m.mu.Unlock()
	subs, ok := m.subs[taskID]
	if !ok {
		return
	}
	for ch := range subs {
		select {
		case ch <- event:
		default:
			delete(subs, ch)
			close(ch)
			log.Warnf("ops task subscriber dropped: task=%d event=%s", taskID, event.Type)
		}
	}
	if len(subs) == 0 {
		delete(m.subs, taskID)
	}
}

func (m *TaskManager) Close(taskID int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if subs, ok := m.subs[taskID]; ok {
		for ch := range subs {
			close(ch)
		}
		delete(m.subs, taskID)
	}
}

func (m *TaskManager) StartTask(taskID int, run func(context.Context)) {
	m.mu.Lock()
	baseCtx := m.rootCtx
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	taskCtx, cancel := context.WithCancel(baseCtx)
	m.taskCancels[taskID] = cancel
	m.wg.Add(1)
	m.mu.Unlock()

	go func() {
		defer m.finishTask(taskID)
		run(taskCtx)
	}()
}

func (m *TaskManager) CancelTask(taskID int) bool {
	m.mu.RLock()
	cancel := m.taskCancels[taskID]
	m.mu.RUnlock()
	if cancel == nil {
		return false
	}
	cancel()
	return true
}

func (m *TaskManager) CancelAll() {
	m.mu.RLock()
	cancels := make([]context.CancelFunc, 0, len(m.taskCancels))
	for _, cancel := range m.taskCancels {
		cancels = append(cancels, cancel)
	}
	m.mu.RUnlock()
	for _, cancel := range cancels {
		cancel()
	}
}

func (m *TaskManager) Wait(timeout time.Duration) bool {
	done := make(chan struct{})
	go func() {
		defer close(done)
		m.wg.Wait()
	}()
	select {
	case <-done:
		return true
	case <-time.After(timeout):
		return false
	}
}

func (m *TaskManager) finishTask(taskID int) {
	m.mu.Lock()
	delete(m.taskCancels, taskID)
	m.mu.Unlock()
	m.wg.Done()
}
