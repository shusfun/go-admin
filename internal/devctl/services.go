package devctl

import (
	"fmt"
	"path/filepath"
	"runtime"
)

type ServiceKind string

const (
	ServiceLocal  ServiceKind = "local"
	ServiceDocker ServiceKind = "docker"
)

type CommandSpec struct {
	Name string
	Args []string
	Env  map[string]string
	Dir  string
}

type ServiceSpec struct {
	Name        string
	Label       string
	Group       string
	Kind        ServiceKind
	Port        int
	ComposeName string
	DefaultMode string
	Command     func(*App) CommandSpec
}

func allServices(app *App) []ServiceSpec {
	return []ServiceSpec{
		{
			Name:        "backend",
			Label:       "后端 API",
			Group:       "本地服务",
			Kind:        ServiceLocal,
			Port:        app.LocalServicePort("backend"),
			DefaultMode: platformDefaultLocalMode(),
			Command: func(app *App) CommandSpec {
				return CommandSpec{
					Name: "go",
					Args: []string{"run", ".", "server", "-c", filepath.ToSlash(app.ConfigFile)},
					Env:  app.GoEnv(),
					Dir:  app.BackendRoot,
				}
			},
		},
		{
			Name:        "admin",
			Label:       "管理端",
			Group:       "本地服务",
			Kind:        ServiceLocal,
			Port:        app.LocalServicePort("admin"),
			DefaultMode: platformDefaultLocalMode(),
			Command: func(app *App) CommandSpec {
				return CommandSpec{
					Name: "pnpm",
					Args: []string{"--filter", "@suiyuan/admin-web", "dev"},
					Dir:  app.RepoRoot,
				}
			},
		},
		{
			Name:        "mobile",
			Label:       "移动端",
			Group:       "本地服务",
			Kind:        ServiceLocal,
			Port:        app.LocalServicePort("mobile"),
			DefaultMode: platformDefaultLocalMode(),
			Command: func(app *App) CommandSpec {
				return CommandSpec{
					Name: "pnpm",
					Args: []string{"--filter", "@suiyuan/mobile-h5", "dev"},
					Dir:  app.RepoRoot,
				}
			},
		},
		{
			Name:        "showcase",
			Label:       "UI Showcase",
			Group:       "本地服务",
			Kind:        ServiceLocal,
			Port:        app.LocalServicePort("showcase"),
			DefaultMode: platformDefaultLocalMode(),
			Command: func(app *App) CommandSpec {
				return CommandSpec{
					Name: "pnpm",
					Args: []string{"--filter", "@suiyuan/ui-showcase", "dev"},
					Dir:  app.RepoRoot,
				}
			},
		},
		{
			Name:        "postgres",
			Label:       "PostgreSQL",
			Group:       "基础设施",
			Kind:        ServiceDocker,
			Port:        app.LocalServicePort("postgres"),
			ComposeName: "postgres",
			DefaultMode: "docker",
		},
		{
			Name:        "redis",
			Label:       "Redis",
			Group:       "基础设施",
			Kind:        ServiceDocker,
			Port:        app.LocalServicePort("redis"),
			ComposeName: "redis",
			DefaultMode: "docker",
		},
	}
}

func findService(app *App, name string) (ServiceSpec, error) {
	for _, service := range allServices(app) {
		if service.Name == name {
			return service, nil
		}
	}
	return ServiceSpec{}, fmt.Errorf("未知服务：%s", name)
}

func normalizeServiceList(app *App, values []string) ([]ServiceSpec, error) {
	if len(values) == 0 {
		return nil, fmt.Errorf("至少指定一个服务，可选值：backend, admin, mobile, showcase, postgres, redis")
	}
	if len(values) == 1 && values[0] == "all" {
		return allServices(app), nil
	}

	result := make([]ServiceSpec, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		service, err := findService(app, value)
		if err != nil {
			return nil, err
		}
		if _, ok := seen[service.Name]; ok {
			continue
		}
		seen[service.Name] = struct{}{}
		result = append(result, service)
	}
	return result, nil
}

func platformDefaultLocalMode() string {
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		return "terminal"
	}
	return "inline"
}
