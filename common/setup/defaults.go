package setup

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type SetupDefaults struct {
	Environment string         `json:"environment"`
	Database    DatabaseConfig `json:"database"`
	Admin       AdminConfig    `json:"admin"`
}

type devEnvDefaults struct {
	postgresPort     int
	postgresDB       string
	postgresUser     string
	postgresPassword string
}

type repoProfile struct {
	Infra struct {
		Provider string `json:"provider"`
		Postgres struct {
			Host string `json:"host"`
			Port int    `json:"port"`
		} `json:"postgres"`
	} `json:"infra"`
}

var repoProfileReader = readRepoProfile

func ReadApplicationMode(defaultMode string) string {
	settings, err := ReadCurrentSettings()
	if err != nil {
		return defaultMode
	}

	settingsMap, ok := settings["settings"].(map[string]interface{})
	if !ok {
		return defaultMode
	}

	applicationMap, ok := settingsMap["application"].(map[string]interface{})
	if !ok {
		return defaultMode
	}

	mode := strings.TrimSpace(readString(applicationMap["mode"]))
	if mode == "" {
		return defaultMode
	}

	return strings.ToLower(mode)
}

func ReadSetupDefaults() SetupDefaults {
	mode := normalizeEnvironment(ReadApplicationMode("dev"))

	if profile, err := repoProfileReader(); err == nil && hasLocalInfraProfile(profile) && NeedsSetup() {
		defaults := defaultSetupDefaults("dev")
		applyRepoProfileDefaults(&defaults.Database, profile)
		return defaults
	}

	defaults := defaultSetupDefaults(mode)

	settings, err := ReadCurrentSettings()
	if err != nil {
		return defaults
	}

	settingsMap, ok := settings["settings"].(map[string]interface{})
	if !ok {
		return defaults
	}

	applyDatabaseDefaults(&defaults.Database, settingsMap)
	if !isLocalEnvironment(mode) {
		defaults.Database.Password = ""
	}
	return defaults
}

func hasLocalInfraProfile(profile *repoProfile) bool {
	if profile == nil {
		return false
	}
	switch strings.TrimSpace(strings.ToLower(profile.Infra.Provider)) {
	case "docker", "global":
		return true
	default:
		return false
	}
}

func applyRepoProfileDefaults(target *DatabaseConfig, profile *repoProfile) {
	if profile == nil {
		return
	}
	if host := strings.TrimSpace(profile.Infra.Postgres.Host); host != "" {
		target.Host = host
	}
	if validatePort(profile.Infra.Postgres.Port) {
		target.Port = profile.Infra.Postgres.Port
	}
}

func normalizeEnvironment(mode string) string {
	normalized := strings.ToLower(strings.TrimSpace(mode))
	if normalized == "" {
		return "dev"
	}
	return normalized
}

func defaultSetupDefaults(mode string) SetupDefaults {
	if isLocalEnvironment(mode) {
		devDefaults := readDevEnvDefaults()
		return SetupDefaults{
			Environment: mode,
			Database: DatabaseConfig{
				Host:     "127.0.0.1",
				Port:     devDefaults.postgresPort,
				User:     devDefaults.postgresUser,
				Password: devDefaults.postgresPassword,
				DBName:   devDefaults.postgresDB,
				SSLMode:  "disable",
			},
			Admin: AdminConfig{
				Username: "admin",
			},
		}
	}

	return SetupDefaults{
		Environment: mode,
		Database: DatabaseConfig{
			Host:    "postgres",
			Port:    5432,
			User:    "postgres",
			DBName:  "go_admin",
			SSLMode: "disable",
		},
		Admin: AdminConfig{
			Username: "admin",
		},
	}
}

func isLocalEnvironment(mode string) bool {
	switch normalizeEnvironment(mode) {
	case "dev", "test":
		return true
	default:
		return false
	}
}

func readDevEnvDefaults() devEnvDefaults {
	projectName := readProjectName()
	devDBName := projectNameToDBPrefix(projectName) + "_dev"

	defaults := devEnvDefaults{
		postgresPort:     15432,
		postgresDB:       devDBName,
		postgresUser:     devDBName,
		postgresPassword: devDBName,
	}

	envPath := filepath.Join("config", "dev-ports.env")
	content, err := os.ReadFile(envPath)
	if err != nil {
		return defaults
	}

	for _, rawLine := range strings.Split(string(content), "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		switch key {
		case "DEV_POSTGRES_PORT":
			if port, err := strconv.Atoi(value); err == nil && validatePort(port) {
				defaults.postgresPort = port
			}
		case "DEV_POSTGRES_DB":
			if value != "" {
				defaults.postgresDB = value
			}
		case "DEV_POSTGRES_USER":
			if value != "" {
				defaults.postgresUser = value
			}
		case "DEV_POSTGRES_PASSWORD":
			defaults.postgresPassword = value
		}
	}

	if profile, err := repoProfileReader(); err == nil {
		if validatePort(profile.Infra.Postgres.Port) {
			defaults.postgresPort = profile.Infra.Postgres.Port
		}
	}

	return defaults
}

func readRepoProfile() (*repoProfile, error) {
	packageJSONPath, err := findProjectPackageJSONPath()
	if err != nil {
		return nil, err
	}

	repoRoot := filepath.Dir(packageJSONPath)
	profilePath := filepath.Join(repoRoot, "temp", "repo-cli", "profile.json")
	content, err := os.ReadFile(profilePath)
	if err != nil {
		return nil, err
	}

	var profile repoProfile
	if err := json.Unmarshal(content, &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}

func readProjectName() string {
	packageJSONPath, err := findProjectPackageJSONPath()
	if err != nil {
		panic(err)
	}

	content, err := os.ReadFile(packageJSONPath)
	if err != nil {
		panic(fmt.Errorf("读取 package.json 失败: %w", err))
	}

	var payload struct {
		Name string `json:"name"`
	}
	if err := json.Unmarshal(content, &payload); err != nil {
		panic(fmt.Errorf("解析 package.json 失败: %w", err))
	}

	name := strings.TrimSpace(payload.Name)
	if name == "" {
		panic("package.json.name 不能为空")
	}

	return name
}

func findProjectPackageJSONPath() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("读取当前工作目录失败: %w", err)
	}

	for {
		candidate := filepath.Join(dir, "package.json")
		if _, statErr := os.Stat(candidate); statErr == nil {
			return candidate, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("未找到仓库根 package.json")
		}
		dir = parent
	}
}

func projectNameToDevName(name string) string {
	parts := mustProjectNameParts(name)
	return strings.Join(parts, "-") + "-dev"
}

func projectNameToDBPrefix(name string) string {
	parts := mustProjectNameParts(name)
	return strings.Join(parts, "_")
}

func mustProjectNameParts(name string) []string {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" {
		panic("package.json.name 不能为空")
	}

	parts := splitNormalizedParts(normalized)
	if len(parts) == 0 {
		panic("package.json.name 归一化后不能为空")
	}

	return parts
}

func splitNormalizedParts(value string) []string {
	parts := strings.FieldsFunc(value, func(r rune) bool {
		return (r < 'a' || r > 'z') && (r < '0' || r > '9')
	})

	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			filtered = append(filtered, part)
		}
	}

	return filtered
}

func applyDatabaseDefaults(target *DatabaseConfig, settingsMap map[string]interface{}) {
	databaseMap := readMap(settingsMap["database"])
	if databaseMap == nil {
		return
	}

	if !strings.EqualFold(readString(databaseMap["driver"]), "postgres") {
		return
	}

	parsed := parsePostgresSource(readString(databaseMap["source"]))
	overlayDatabaseConfig(target, parsed)
}

func overlayDatabaseConfig(target *DatabaseConfig, source DatabaseConfig) {
	if source.Host != "" {
		target.Host = source.Host
	}
	if source.Port > 0 {
		target.Port = source.Port
	}
	if source.User != "" {
		target.User = source.User
	}
	if source.Password != "" {
		target.Password = source.Password
	}
	if source.DBName != "" {
		target.DBName = source.DBName
	}
	if source.SSLMode != "" {
		target.SSLMode = source.SSLMode
	}
}

func parsePostgresSource(source string) DatabaseConfig {
	source = strings.TrimSpace(source)
	if source == "" {
		return DatabaseConfig{}
	}

	if strings.Contains(source, "://") {
		return parsePostgresURL(source)
	}

	values := map[string]string{}
	for _, token := range strings.Fields(source) {
		parts := strings.SplitN(token, "=", 2)
		if len(parts) != 2 {
			continue
		}
		values[strings.ToLower(parts[0])] = parts[1]
	}

	return databaseConfigFromMap(values)
}

func parsePostgresURL(source string) DatabaseConfig {
	parsedURL, err := url.Parse(source)
	if err != nil {
		return DatabaseConfig{}
	}

	port, _ := strconv.Atoi(parsedURL.Port())
	password, _ := parsedURL.User.Password()

	return DatabaseConfig{
		Host:     parsedURL.Hostname(),
		Port:     port,
		User:     parsedURL.User.Username(),
		Password: password,
		DBName:   strings.TrimPrefix(parsedURL.Path, "/"),
		SSLMode:  parsedURL.Query().Get("sslmode"),
	}
}

func databaseConfigFromMap(values map[string]string) DatabaseConfig {
	port, _ := strconv.Atoi(values["port"])

	return DatabaseConfig{
		Host:     values["host"],
		Port:     port,
		User:     values["user"],
		Password: values["password"],
		DBName:   values["dbname"],
		SSLMode:  values["sslmode"],
	}
}

func readMap(value interface{}) map[string]interface{} {
	if value == nil {
		return nil
	}

	result, ok := value.(map[string]interface{})
	if !ok {
		return nil
	}

	return result
}

func readString(value interface{}) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return ""
	}
}

func readInt(value interface{}) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	case string:
		number, err := strconv.Atoi(strings.TrimSpace(typed))
		if err == nil {
			return number
		}
	}

	return -1
}
