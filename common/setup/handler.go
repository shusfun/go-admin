package setup

import (
	"fmt"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ─── 路由注册 ───

// RegisterRoutes 注册 Setup Wizard 路由到 Gin 引擎
// 这些路由不需要认证，只在 Setup 模式下可用
func RegisterRoutes(r *gin.Engine) {
	RegisterStatusRoute(r)

	protected := r.Group("/api/v1/setup")
	protected.Use(setupGuard())
	{
		protected.POST("/test-db", testDatabase)
		protected.POST("/test-redis", testRedis)
		protected.POST("/install", install)
	}
}

// RegisterStatusRoute 注册只读的 setup 状态接口。
func RegisterStatusRoute(r gin.IRouter) {
	g := r.Group("/api/v1/setup")
	g.GET("/status", getStatus)
}

// ─── 响应辅助 ───

func setupOK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"data": data,
		"msg":  "ok",
	})
}

func setupError(c *gin.Context, httpCode int, msg string) {
	c.JSON(httpCode, gin.H{
		"code": httpCode,
		"data": nil,
		"msg":  msg,
	})
}

// ─── 中间件 ───

// setupGuard 确保安装相关端点仅在系统未安装时可访问
func setupGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !NeedsSetup() {
			setupError(c, http.StatusForbidden, "系统已安装，不允许重复执行安装操作")
			c.Abort()
			return
		}
		c.Next()
	}
}

// ─── 输入校验 ───

var (
	hostnameRegex = regexp.MustCompile(`^[a-zA-Z0-9.\-:]+$`)
	dbNameRegex   = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]*$`)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
)

func validateHostname(host string) bool {
	return hostnameRegex.MatchString(host) && len(host) <= 253
}

func validateDBName(name string) bool {
	return dbNameRegex.MatchString(name) && len(name) <= 63
}

func validateUsername(name string) bool {
	return usernameRegex.MatchString(name) && len(name) <= 63
}

func validateEmail(email string) bool {
	if email == "" {
		return true // 邮箱可选
	}
	_, err := mail.ParseAddress(email)
	return err == nil && len(email) <= 254
}

func validatePassword(password string) error {
	if len(password) < 6 {
		return fmt.Errorf("密码长度不能少于 6 位")
	}
	if len(password) > 128 {
		return fmt.Errorf("密码长度不能超过 128 位")
	}
	return nil
}

func validatePort(port int) bool {
	return port > 0 && port <= 65535
}

func validateSSLMode(mode string) bool {
	validModes := map[string]bool{
		"disable": true, "require": true, "verify-ca": true, "verify-full": true,
	}
	return validModes[mode]
}

// ─── 请求结构体 ───

type statusResponse struct {
	NeedsSetup bool          `json:"needs_setup"`
	Step       string        `json:"step"`
	Defaults   SetupDefaults `json:"defaults"`
}

type testDBRequest struct {
	Host     string `json:"host" binding:"required"`
	Port     int    `json:"port" binding:"required"`
	User     string `json:"user" binding:"required"`
	Password string `json:"password"`
	DBName   string `json:"dbname" binding:"required"`
	SSLMode  string `json:"sslmode"`
}

type testRedisRequest struct {
	Host     string `json:"host" binding:"required"`
	Port     int    `json:"port" binding:"required"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

type installRequest struct {
	Database DatabaseConfig `json:"database" binding:"required"`
	Redis    RedisConfig    `json:"redis" binding:"required"`
	Admin    AdminConfig    `json:"admin" binding:"required"`
}

// ─── Handler ───

func getStatus(c *gin.Context) {
	setupOK(c, statusResponse{
		NeedsSetup: NeedsSetup(),
		Step:       "welcome",
		Defaults:   ReadSetupDefaults(),
	})
}

func testDatabase(c *gin.Context) {
	var req testDBRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		setupError(c, http.StatusBadRequest, "请求参数错误: "+err.Error())
		return
	}

	// 安全校验：防止注入
	if !validateHostname(req.Host) {
		setupError(c, http.StatusBadRequest, "主机名格式无效")
		return
	}
	if !validatePort(req.Port) {
		setupError(c, http.StatusBadRequest, "端口号无效")
		return
	}
	if !validateUsername(req.User) {
		setupError(c, http.StatusBadRequest, "用户名格式无效")
		return
	}
	if !validateDBName(req.DBName) {
		setupError(c, http.StatusBadRequest, "数据库名称格式无效")
		return
	}
	if req.SSLMode == "" {
		req.SSLMode = "disable"
	}
	if !validateSSLMode(req.SSLMode) {
		setupError(c, http.StatusBadRequest, "SSL 模式无效")
		return
	}

	cfg := &DatabaseConfig{
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
		DBName:   req.DBName,
		SSLMode:  req.SSLMode,
	}

	if err := TestPgConnection(cfg); err != nil {
		setupError(c, http.StatusBadRequest, "数据库连接失败: "+err.Error())
		return
	}

	setupOK(c, gin.H{"message": "数据库连接成功"})
}

func testRedis(c *gin.Context) {
	var req testRedisRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		setupError(c, http.StatusBadRequest, "请求参数错误: "+err.Error())
		return
	}

	if !validateHostname(req.Host) {
		setupError(c, http.StatusBadRequest, "主机名格式无效")
		return
	}
	if !validatePort(req.Port) {
		setupError(c, http.StatusBadRequest, "端口号无效")
		return
	}
	if req.DB < 0 || req.DB > 15 {
		setupError(c, http.StatusBadRequest, "Redis 数据库编号无效 (0-15)")
		return
	}

	cfg := &RedisConfig{
		Host:     req.Host,
		Port:     req.Port,
		Password: req.Password,
		DB:       req.DB,
	}

	if err := TestRedisConnection(cfg); err != nil {
		setupError(c, http.StatusBadRequest, "Redis 连接失败: "+err.Error())
		return
	}

	setupOK(c, gin.H{"message": "Redis 连接成功"})
}

func install(c *gin.Context) {
	// TOCTOU 保护：双重检查
	if !NeedsSetup() {
		setupError(c, http.StatusForbidden, "系统已安装，不允许重复安装")
		return
	}

	var req installRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		setupError(c, http.StatusBadRequest, "请求参数错误: "+err.Error())
		return
	}

	// ========== 全面输入校验 ==========

	// 数据库
	req.Database.Host = strings.TrimSpace(req.Database.Host)
	req.Database.User = strings.TrimSpace(req.Database.User)
	req.Database.DBName = strings.TrimSpace(req.Database.DBName)

	if !validateHostname(req.Database.Host) {
		setupError(c, http.StatusBadRequest, "数据库主机名无效")
		return
	}
	if !validatePort(req.Database.Port) {
		setupError(c, http.StatusBadRequest, "数据库端口无效")
		return
	}
	if !validateUsername(req.Database.User) {
		setupError(c, http.StatusBadRequest, "数据库用户名无效")
		return
	}
	if !validateDBName(req.Database.DBName) {
		setupError(c, http.StatusBadRequest, "数据库名称无效")
		return
	}
	if req.Database.SSLMode == "" {
		req.Database.SSLMode = "disable"
	}
	if !validateSSLMode(req.Database.SSLMode) {
		setupError(c, http.StatusBadRequest, "SSL 模式无效")
		return
	}

	// Redis
	req.Redis.Host = strings.TrimSpace(req.Redis.Host)
	if !validateHostname(req.Redis.Host) {
		setupError(c, http.StatusBadRequest, "Redis 主机名无效")
		return
	}
	if !validatePort(req.Redis.Port) {
		setupError(c, http.StatusBadRequest, "Redis 端口无效")
		return
	}
	if req.Redis.DB < 0 || req.Redis.DB > 15 {
		setupError(c, http.StatusBadRequest, "Redis 数据库编号无效")
		return
	}

	// 管理员
	req.Admin.Username = strings.TrimSpace(req.Admin.Username)
	req.Admin.Email = strings.TrimSpace(req.Admin.Email)
	req.Admin.Phone = strings.TrimSpace(req.Admin.Phone)

	if !validateUsername(req.Admin.Username) {
		setupError(c, http.StatusBadRequest, "管理员用户名无效")
		return
	}
	if !validateEmail(req.Admin.Email) {
		setupError(c, http.StatusBadRequest, "管理员邮箱格式无效")
		return
	}
	if err := validatePassword(req.Admin.Password); err != nil {
		setupError(c, http.StatusBadRequest, err.Error())
		return
	}

	// ========== 执行安装 ==========

	cfg := &SetupConfig{
		Database: req.Database,
		Redis:    req.Redis,
		Admin:    req.Admin,
	}

	if err := Install(cfg); err != nil {
		setupError(c, http.StatusInternalServerError, "安装失败: "+err.Error())
		return
	}

	// 安装完成后在后台延迟退出进程，让 systemd/Docker 自动重启
	go func() {
		time.Sleep(500 * time.Millisecond)
		os.Exit(0)
	}()

	setupOK(c, gin.H{
		"message": "安装成功！服务将自动重启...",
		"restart": true,
	})
}
