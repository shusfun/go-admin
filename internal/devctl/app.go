package devctl

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
)

type AppOptions struct {
	ConfigFile    string
	ProjectPrefix string
	RepoRoot      string
}

type App struct {
	RepoRoot        string
	ConfigFile      string
	ProjectPrefix   string
	PackageName     string
	Ports           map[string]int
	GoBinDir        string
	GoCacheDir      string
	GoModCacheDir   string
	DevctlDir       string
	LogsDir         string
	StatePath       string
	DockerEnvFile   string
	DockerDevFile   string
	DockerAppFile   string
	BackendBinary   string
	DevctlBinary    string
	FrontendStore   string
	BackendRoot     string
	AdminDistDir    string
	MobileDistDir   string
	ShowcaseDistDir string
	RootDistDir     string
	InstallLockFile string
	SettingsFile    string
	ProfilePath     string
}

func NewApp(opts AppOptions) (*App, error) {
	repoRoot, err := findRepoRoot(opts.RepoRoot)
	if err != nil {
		return nil, err
	}

	packageName, err := readPackageName(filepath.Join(repoRoot, "package.json"))
	if err != nil {
		return nil, err
	}

	ports, err := loadPorts(filepath.Join(repoRoot, "config", "dev-ports.env"))
	if err != nil {
		return nil, err
	}

	projectPrefix := opts.ProjectPrefix
	profilePath := filepath.Join(repoRoot, "temp", "devctl", "profile.json")
	if projectPrefix == "" {
		profile, err := loadProfile(profilePath)
		if err != nil {
			return nil, err
		}
		if profile.ProjectPrefix != "" {
			projectPrefix = profile.ProjectPrefix
		} else {
			projectPrefix = normalizeProjectPrefix(packageName)
		}
	}

	goTmpDir := filepath.Join(repoRoot, ".tmp", "go")
	goBinDir := filepath.Join(repoRoot, ".tmp", "bin")
	devctlDir := filepath.Join(repoRoot, "temp", "devctl")

	app := &App{
		RepoRoot:        repoRoot,
		ConfigFile:      filepath.Clean(filepath.Join(repoRoot, opts.ConfigFile)),
		ProjectPrefix:   projectPrefix,
		PackageName:     packageName,
		Ports:           ports,
		GoBinDir:        goBinDir,
		GoCacheDir:      filepath.Join(goTmpDir, "cache"),
		GoModCacheDir:   filepath.Join(goTmpDir, "mod"),
		DevctlDir:       devctlDir,
		LogsDir:         filepath.Join(devctlDir, "logs"),
		StatePath:       filepath.Join(devctlDir, "state.json"),
		DockerEnvFile:   filepath.Join(repoRoot, "config", "dev-ports.env"),
		DockerDevFile:   filepath.Join(repoRoot, "docker-compose.dev.yml"),
		DockerAppFile:   filepath.Join(repoRoot, "docker-compose.yml"),
		BackendBinary:   filepath.Join(repoRoot, executableName(normalizeProjectPrefix(packageName))),
		DevctlBinary:    filepath.Join(repoRoot, executableName("devctl")),
		FrontendStore:   filepath.Join(repoRoot, ".pnpm-store"),
		BackendRoot:     repoRoot,
		AdminDistDir:    filepath.Join(repoRoot, "frontend", "apps", "admin-web", "dist"),
		MobileDistDir:   filepath.Join(repoRoot, "frontend", "apps", "mobile-h5", "dist"),
		ShowcaseDistDir: filepath.Join(repoRoot, "frontend", "apps", "ui-showcase", "dist"),
		RootDistDir:     filepath.Join(repoRoot, "dist"),
		InstallLockFile: filepath.Join(repoRoot, "config", ".installed"),
		SettingsFile:    filepath.Join(repoRoot, "config", "settings.yml"),
		ProfilePath:     profilePath,
	}

	if err := ensureDir(app.DevctlDir); err != nil {
		return nil, err
	}
	if err := ensureDir(app.LogsDir); err != nil {
		return nil, err
	}

	return app, nil
}

func findRepoRoot(explicit string) (string, error) {
	candidates := make([]string, 0, 3)
	if explicit != "" {
		candidates = append(candidates, explicit)
	}
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, cwd)
	}
	if exePath, err := os.Executable(); err == nil {
		candidates = append(candidates, filepath.Dir(exePath))
	}

	for _, candidate := range candidates {
		root, err := walkRepoRoot(candidate)
		if err == nil {
			return root, nil
		}
	}

	return "", errors.New("未找到仓库根目录，请在 go-admin 仓库内运行，或通过 --repo-root 指定")
}

func walkRepoRoot(start string) (string, error) {
	current, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		if fileExists(filepath.Join(current, "go.mod")) && fileExists(filepath.Join(current, "config", "dev-ports.env")) {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return "", errors.New("未命中仓库标记文件")
		}
		current = parent
	}
}

func readPackageName(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var payload struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(data, &payload); err != nil {
		return "", err
	}
	if payload.Name == "" {
		return "", errors.New("package.json 缺少 name 字段")
	}
	return payload.Name, nil
}

func loadPorts(path string) (map[string]int, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	result := map[string]int{}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}
		value, err := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err != nil {
			return nil, fmt.Errorf("解析端口失败 %s: %w", line, err)
		}
		result[strings.TrimSpace(parts[0])] = value
	}
	return result, nil
}

func normalizeProjectPrefix(name string) string {
	re := regexp.MustCompile(`[^a-z0-9_-]+`)
	prefix := strings.ToLower(name)
	prefix = re.ReplaceAllString(prefix, "-")
	prefix = strings.Trim(prefix, "-_")
	if prefix == "" {
		return "go-admin"
	}
	return prefix
}

func executableName(base string) string {
	if runtime.GOOS == "windows" {
		return base + ".exe"
	}
	return base
}

func ensureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func (a *App) GoEnv() map[string]string {
	return map[string]string{
		"GOCACHE":    a.GoCacheDir,
		"GOMODCACHE": a.GoModCacheDir,
		"GOBIN":      a.GoBinDir,
	}
}

func (a *App) ComposeEnv() map[string]string {
	normalizedDB := strings.ReplaceAll(a.ProjectPrefix, "-", "_")
	if normalizedDB == "" {
		normalizedDB = "go_admin"
	}
	devDB := normalizedDB + "_dev"
	return map[string]string{
		"DEV_POSTGRES_DB":       devDB,
		"DEV_POSTGRES_USER":     devDB,
		"DEV_POSTGRES_PASSWORD": devDB,
	}
}

func (a *App) ComposeBaseArgs(dev bool) []string {
	args := []string{"compose", "--project-name", a.ProjectPrefix, "--env-file", a.DockerEnvFile}
	if dev {
		args = append(args, "-f", a.DockerDevFile)
	}
	return args
}

func (a *App) LocalServicePort(name string) int {
	switch name {
	case "backend":
		return a.Ports["DEV_BACKEND_PORT"]
	case "admin":
		return a.Ports["DEV_ADMIN_PORT"]
	case "mobile":
		return a.Ports["DEV_MOBILE_PORT"]
	case "showcase":
		return a.Ports["DEV_SHOWCASE_PORT"]
	case "postgres":
		return a.Ports["DEV_POSTGRES_PORT"]
	case "redis":
		return a.Ports["DEV_REDIS_PORT"]
	default:
		return 0
	}
}

type devctlProfile struct {
	ProjectPrefix string `json:"project_prefix,omitempty"`
}

func loadProfile(path string) (devctlProfile, error) {
	if !fileExists(path) {
		return devctlProfile{}, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return devctlProfile{}, err
	}
	if len(data) == 0 {
		return devctlProfile{}, nil
	}
	var profile devctlProfile
	if err := json.Unmarshal(data, &profile); err != nil {
		return devctlProfile{}, err
	}
	return profile, nil
}

func saveProfile(path string, profile devctlProfile) error {
	if err := ensureDir(filepath.Dir(path)); err != nil {
		return err
	}
	data, err := json.MarshalIndent(profile, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}

func portOpen(port int) bool {
	if port == 0 {
		return false
	}
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 300000000)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

func commandExists(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}
