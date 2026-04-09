package devctl

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/gofrs/flock"
)

type ServiceState struct {
	Name          string `json:"name"`
	Status        string `json:"status"`
	Mode          string `json:"mode"`
	Port          int    `json:"port"`
	ControllerPID int    `json:"controller_pid"`
	ChildPID      int    `json:"child_pid"`
	LogPath       string `json:"log_path"`
	LastError     string `json:"last_error,omitempty"`
	StartedAt     string `json:"started_at,omitempty"`
	UpdatedAt     string `json:"updated_at,omitempty"`
	ExitedAt      string `json:"exited_at,omitempty"`
}

type RuntimeState struct {
	Services map[string]ServiceState `json:"services"`
}

type StateStore struct {
	path string
	lock *flock.Flock
}

func NewStateStore(app *App) *StateStore {
	return &StateStore{
		path: app.StatePath,
		lock: flock.New(app.StatePath + ".lock"),
	}
}

func (s *StateStore) Load() (RuntimeState, error) {
	if err := ensureDir(filepath.Dir(s.path)); err != nil {
		return RuntimeState{}, err
	}
	if err := s.lock.Lock(); err != nil {
		return RuntimeState{}, err
	}
	defer func() { _ = s.lock.Unlock() }()
	return s.loadUnlocked()
}

func (s *StateStore) Update(mutator func(*RuntimeState) error) error {
	if err := ensureDir(filepath.Dir(s.path)); err != nil {
		return err
	}
	if err := s.lock.Lock(); err != nil {
		return err
	}
	defer func() { _ = s.lock.Unlock() }()

	state, err := s.loadUnlocked()
	if err != nil {
		return err
	}
	if err := mutator(&state); err != nil {
		return err
	}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, append(data, '\n'), 0o644)
}

func (s *StateStore) loadUnlocked() (RuntimeState, error) {
	state := RuntimeState{Services: map[string]ServiceState{}}
	if !fileExists(s.path) {
		return state, nil
	}
	data, err := os.ReadFile(s.path)
	if err != nil {
		return state, err
	}
	if len(data) == 0 {
		return state, nil
	}
	if err := json.Unmarshal(data, &state); err != nil {
		brokenPath := fmt.Sprintf("%s.broken-%d", s.path, time.Now().Unix())
		if renameErr := os.Rename(s.path, brokenPath); renameErr != nil {
			return state, fmt.Errorf("状态文件损坏且修复失败: %w", err)
		}
		fmt.Fprintf(os.Stderr, "检测到损坏的状态文件，已迁移到 %s\n", brokenPath)
		return RuntimeState{Services: map[string]ServiceState{}}, nil
	}
	if state.Services == nil {
		state.Services = map[string]ServiceState{}
	}
	return state, nil
}

func nowRFC3339() string {
	return time.Now().Format(time.RFC3339)
}
