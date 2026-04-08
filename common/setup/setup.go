package setup

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	log "github.com/go-admin-team/go-admin-core/logger"
	"go-admin/common/bootstrap"
	"golang.org/x/crypto/bcrypt"
	"gopkg.in/yaml.v3"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ─── 配置文件路径 ───

const (
	// DefaultConfigPath 默认配置文件路径（和 cobra flag 默认值一致）
	DefaultConfigPath = "config/settings.yml"
	// InstallLockFile 安装锁文件名
	InstallLockFile = ".installed"
)

// configPath 可通过 SetConfigPath 覆盖
var configPath = DefaultConfigPath

// SetConfigPath 设置配置文件路径（由 cmd/api 在解析 flag 后调用）
func SetConfigPath(path string) {
	configPath = path
}

// GetConfigPath 返回当前配置文件路径
func GetConfigPath() string {
	return configPath
}

// ReadCurrentSettings 读取当前配置文件内容，供 setup 模式和状态接口复用。
func ReadCurrentSettings() (map[string]interface{}, error) {
	content, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	var settings map[string]interface{}
	if err := yaml.Unmarshal(content, &settings); err != nil {
		return nil, err
	}

	return settings, nil
}

// ReadApplicationPort 读取配置中的应用端口；读取失败时返回默认值。
func ReadApplicationPort(defaultPort int) int {
	settings, err := ReadCurrentSettings()
	if err != nil {
		return defaultPort
	}

	settingsMap, ok := settings["settings"].(map[string]interface{})
	if !ok {
		return defaultPort
	}

	applicationMap, ok := settingsMap["application"].(map[string]interface{})
	if !ok {
		return defaultPort
	}

	switch value := applicationMap["port"].(type) {
	case int:
		return value
	case int64:
		return int(value)
	case float64:
		return int(value)
	default:
		return defaultPort
	}
}

// getInstallLockPath 返回锁文件路径（和配置文件同目录）
func getInstallLockPath() string {
	dir := "."
	if idx := strings.LastIndexAny(configPath, "/\\"); idx >= 0 {
		dir = configPath[:idx]
	}
	return dir + "/" + InstallLockFile
}

// ─── 请求/配置结构体 ───

// SetupConfig 汇总所有 Setup 阶段需要的配置
type SetupConfig struct {
	Database DatabaseConfig `json:"database" yaml:"-"`
	Redis    RedisConfig    `json:"redis" yaml:"-"`
	Admin    AdminConfig    `json:"admin" yaml:"-"`
}

// DatabaseConfig PostgreSQL 连接参数
type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	DBName   string `json:"dbname"`
	SSLMode  string `json:"sslmode"`
}

// RedisConfig Redis 连接参数
type RedisConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

// AdminConfig 管理员账号
type AdminConfig struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
}

// ─── 状态检测 ───

// NeedsSetup 判断系统是否需要初始化安装。
// 仅以安装锁文件为准，避免仓库自带示例配置阻断首次安装流程。
func NeedsSetup() bool {
	if _, err := os.Stat(getInstallLockPath()); !os.IsNotExist(err) {
		return false
	}
	return true
}

// ─── 连接测试 ───

// TestPgConnection 测试 PostgreSQL 连接
func TestPgConnection(cfg *DatabaseConfig) error {
	dsn := buildPgDSN(cfg)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("获取底层连接失败: %w", err)
	}
	defer func() { _ = sqlDB.Close() }()
	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("ping 失败: %w", err)
	}
	return nil
}

// TestRedisConnection 测试 Redis 连接
func TestRedisConnection(cfg *RedisConfig) error {
	// 使用原生 net.Dial 做最简单的 PING 测试，避免引入 redis 依赖
	// go-admin 的 redis 由 go-admin-core 的 config.CacheConfig 管理
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	conn, err := dialRedis(addr, cfg.Password, cfg.DB)
	if err != nil {
		return fmt.Errorf("连接失败: %w", err)
	}
	defer func() { _ = conn.Close() }()
	return nil
}

// ─── 安装流程 ───

// installMutex 防止并发安装（TOCTOU 保护）
var installMutex sync.Mutex

// Install 执行完整安装流程
func Install(cfg *SetupConfig) error {
	installMutex.Lock()
	defer installMutex.Unlock()

	// 双重检查
	if !NeedsSetup() {
		return fmt.Errorf("系统已安装，不允许重复安装")
	}

	// 1. 测试 PG 连接
	if err := TestPgConnection(&cfg.Database); err != nil {
		return fmt.Errorf("数据库连接失败: %w", err)
	}

	// 2. 测试 Redis 连接
	if err := TestRedisConnection(&cfg.Redis); err != nil {
		return fmt.Errorf("Redis 连接失败: %w", err)
	}

	// 3. 初始化数据库表结构 + 种子数据
	if err := initializeDatabase(cfg); err != nil {
		return fmt.Errorf("数据库初始化失败: %w", err)
	}

	// 4. 创建管理员
	if err := createAdminUser(cfg); err != nil {
		return fmt.Errorf("管理员创建失败: %w", err)
	}

	// 5. 生成 settings.yml
	if err := writeSettingsYml(cfg); err != nil {
		return fmt.Errorf("配置文件写入失败: %w", err)
	}

	// 6. 写入锁文件
	if err := createInstallLock(); err != nil {
		return fmt.Errorf("锁文件创建失败: %w", err)
	}

	log.Info("Setup completed successfully")
	return nil
}

// ─── 内部实现 ───

func buildPgDSN(cfg *DatabaseConfig) string {
	sslmode := cfg.SSLMode
	if sslmode == "" {
		sslmode = "disable"
	}
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s TimeZone=Asia/Shanghai",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, sslmode,
	)
}

func buildPgSource(cfg *DatabaseConfig) string {
	return buildPgDSN(cfg)
}

func initializeDatabase(cfg *SetupConfig) error {
	dsn := buildPgDSN(&cfg.Database)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer func() { _ = sqlDB.Close() }()

	return bootstrap.RunDatabaseBootstrap(db.Debug())
}

func createAdminUser(cfg *SetupConfig) error {
	dsn := buildPgDSN(&cfg.Database)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	defer func() { _ = sqlDB.Close() }()

	// 检查是否已存在管理员
	var count int64
	if err := db.Table("sys_user").Where("username = ?", cfg.Admin.Username).Count(&count).Error; err != nil {
		return fmt.Errorf("查询管理员失败: %w", err)
	}

	if count > 0 {
		// 更新密码
		hash, err := hashPassword(cfg.Admin.Password)
		if err != nil {
			return err
		}
		return db.Table("sys_user").
			Where("username = ?", cfg.Admin.Username).
			Updates(map[string]interface{}{
				"password": hash,
				"email":    cfg.Admin.Email,
				"phone":    cfg.Admin.Phone,
			}).Error
	}

	// 创建新管理员
	hash, err := hashPassword(cfg.Admin.Password)
	if err != nil {
		return err
	}

	now := time.Now()
	admin := map[string]interface{}{
		"username":   cfg.Admin.Username,
		"password":   hash,
		"nick_name":  "管理员",
		"phone":      cfg.Admin.Phone,
		"role_id":    1, // 管理员角色
		"salt":       "",
		"avatar":     "",
		"sex":        "0",
		"email":      cfg.Admin.Email,
		"dept_id":    1,
		"post_id":    1,
		"remark":     "系统初始化创建",
		"status":     "2", // 正常状态
		"create_by":  0,
		"update_by":  0,
		"created_at": now,
		"updated_at": now,
	}

	return db.Table("sys_user").Create(admin).Error
}

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("密码加密失败: %w", err)
	}
	return string(hash), nil
}

// writeSettingsYml 生成 settings.yml 配置文件
func writeSettingsYml(cfg *SetupConfig) error {
	jwtSecret, err := generateSecret(32)
	if err != nil {
		return fmt.Errorf("JWT 密钥生成失败: %w", err)
	}

	// 构建和现有 settings.yml 格式一致的结构
	port := ReadApplicationPort(18123)
	settings := map[string]interface{}{
		"settings": map[string]interface{}{
			"application": map[string]interface{}{
				"mode":          "prod",
				"host":          "0.0.0.0",
				"name":          "go-admin",
				"port":          port,
				"readtimeout":   1,
				"writertimeout": 300,
				"enabledp":      false,
			},
			"logger": map[string]interface{}{
				"path":      "temp/logs",
				"stdout":    "",
				"level":     "info",
				"enableddb": false,
			},
			"jwt": map[string]interface{}{
				"secret":  jwtSecret,
				"timeout": 3600,
			},
			"database": map[string]interface{}{
				"driver": "postgres",
				"source": buildPgSource(&cfg.Database),
			},
			"gen": map[string]interface{}{
				"dbname":    cfg.Database.DBName,
				"frontpath": "../go-admin-ui/src",
			},
			"extend": map[string]interface{}{
				"demo": map[string]interface{}{
					"name": "data",
				},
				"ops": map[string]interface{}{
					"taskTimeoutSeconds": 900,
					"environments":       []interface{}{},
				},
			},
			"cache": buildCacheConfig(&cfg.Redis),
			"queue": map[string]interface{}{
				"memory": map[string]interface{}{
					"poolSize": 100,
				},
			},
			"locker": map[string]interface{}{
				"redis": map[string]interface{}{},
			},
		},
	}

	data, err := yaml.Marshal(settings)
	if err != nil {
		return fmt.Errorf("YAML 序列化失败: %w", err)
	}

	// 确保目录存在
	dir := "."
	if idx := strings.LastIndexAny(configPath, "/\\"); idx >= 0 {
		dir = configPath[:idx]
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("创建目录失败: %w", err)
	}

	return os.WriteFile(configPath, data, 0600)
}

func buildCacheConfig(cfg *RedisConfig) map[string]interface{} {
	if cfg.Host == "" {
		// 没有 Redis 配置时使用内存模式
		return map[string]interface{}{
			"memory": "",
		}
	}
	redisAddr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	redisCfg := map[string]interface{}{
		"addr": redisAddr,
		"db":   cfg.DB,
	}
	if cfg.Password != "" {
		redisCfg["password"] = cfg.Password
	}
	return map[string]interface{}{
		"redis": redisCfg,
	}
}

func createInstallLock() error {
	content := fmt.Sprintf("installed_at=%s\n", time.Now().UTC().Format(time.RFC3339))
	return os.WriteFile(getInstallLockPath(), []byte(content), 0400)
}

func generateSecret(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
