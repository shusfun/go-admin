package setup

import (
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type SetupDefaults struct {
	Environment string         `json:"environment"`
	Database    DatabaseConfig `json:"database"`
	Redis       RedisConfig    `json:"redis"`
	Admin       AdminConfig    `json:"admin"`
}

type devEnvDefaults struct {
	postgresPort     int
	redisPort        int
	postgresDB       string
	postgresUser     string
	postgresPassword string
}

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
	applyRedisDefaults(&defaults.Redis, settingsMap)
	if !isLocalEnvironment(mode) {
		defaults.Database.Password = ""
		defaults.Redis.Password = ""
	}
	return defaults
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
			Redis: RedisConfig{
				Host: "127.0.0.1",
				Port: devDefaults.redisPort,
				DB:   0,
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
		Redis: RedisConfig{
			Host: "redis",
			Port: 6379,
			DB:   0,
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
		redisPort:        16379,
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
		case "DEV_REDIS_PORT":
			if port, err := strconv.Atoi(value); err == nil && validatePort(port) {
				defaults.redisPort = port
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

	return defaults
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

func applyRedisDefaults(target *RedisConfig, settingsMap map[string]interface{}) {
	redisMap := firstRedisMap(settingsMap)
	if redisMap == nil {
		return
	}

	if host, port := parseRedisAddress(readString(redisMap["addr"])); host != "" {
		target.Host = host
		if port > 0 {
			target.Port = port
		}
	}

	if host := readString(redisMap["host"]); host != "" {
		target.Host = host
	}
	if port := readInt(redisMap["port"]); port > 0 {
		target.Port = port
	}
	if password := readString(redisMap["password"]); password != "" {
		target.Password = password
	}
	if db := readInt(redisMap["db"]); db >= 0 {
		target.DB = db
	}
}

func firstRedisMap(settingsMap map[string]interface{}) map[string]interface{} {
	paths := [][]string{
		{"cache", "redis"},
		{"queue", "redis"},
		{"locker", "redis"},
	}

	for _, path := range paths {
		current := settingsMap
		valid := true
		for _, key := range path {
			next := readMap(current[key])
			if next == nil {
				valid = false
				break
			}
			current = next
		}
		if valid && len(current) > 0 {
			return current
		}
	}

	return nil
}

func parseRedisAddress(addr string) (string, int) {
	addr = strings.TrimSpace(addr)
	if addr == "" {
		return "", 0
	}

	if strings.Contains(addr, "://") {
		parsedURL, err := url.Parse(addr)
		if err == nil {
			port, _ := strconv.Atoi(parsedURL.Port())
			return parsedURL.Hostname(), port
		}
	}

	host, portStr, err := net.SplitHostPort(addr)
	if err == nil {
		port, _ := strconv.Atoi(portStr)
		return host, port
	}

	lastColon := strings.LastIndex(addr, ":")
	if lastColon > 0 && lastColon < len(addr)-1 {
		port, err := strconv.Atoi(addr[lastColon+1:])
		if err == nil {
			return addr[:lastColon], port
		}
	}

	return addr, 0
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
