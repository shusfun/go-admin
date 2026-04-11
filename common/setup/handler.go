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

var installSetup = Install
var prepareSetupRestart = buildSetupRestartPlan
var executeSetupRestart = execSetupRestartPlan
var sleepBeforeSetupRestart = func() {
	time.Sleep(500 * time.Millisecond)
}
var exitSetupProcess = os.Exit

var scheduleSetupRestart = func() error {
	plan, err := prepareSetupRestart()
	if err != nil {
		return err
	}
	go func() {
		sleepBeforeSetupRestart()
		if err := executeSetupRestart(plan); err != nil {
			fmt.Fprintf(os.Stderr, "setup restart failed: %v\n", err)
			exitSetupProcess(1)
			return
		}
		exitSetupProcess(0)
	}()
	return nil
}

// ─── 路由注册 ───

// RegisterRoutes 注册 Setup Wizard 路由到 Gin 引擎
// 这些路由不需要认证，只在 Setup 模式下可用
func RegisterRoutes(r *gin.Engine) {
	RegisterStatusRoute(r)

	protected := r.Group("/api/v1/setup")
	protected.Use(setupGuard())
	{
		protected.POST("/test-db", testDatabase)
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

func sanitizeSetupErrorMessage(msg, fallback string) string {
	cleaned := strings.TrimSpace(msg)
	if cleaned == "" {
		return fallback
	}
	if strings.Contains(cleaned, "请求参数错误") {
		return "提交的信息不完整或格式不正确，请检查后重试"
	}
	if strings.Contains(cleaned, "数据库连接失败") {
		return "数据库连接失败，请检查地址、端口和账号信息"
	}
	return fallback
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
}

type installRequest struct {
	Environment string         `json:"environment"`
	Database    DatabaseConfig `json:"database" binding:"required"`
	Admin       AdminConfig    `json:"admin" binding:"required"`
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
		setupError(c, http.StatusBadRequest, sanitizeSetupErrorMessage("请求参数错误: "+err.Error(), "提交的信息不完整或格式不正确，请检查后重试"))
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
	cfg := &DatabaseConfig{
		Host:     req.Host,
		Port:     req.Port,
		User:     req.User,
		Password: req.Password,
		DBName:   req.DBName,
		SSLMode:  "disable",
	}

	if err := TestPgConnection(cfg); err != nil {
		setupError(c, http.StatusBadRequest, sanitizeSetupErrorMessage("数据库连接失败: "+err.Error(), "数据库连接失败，请检查地址、端口和账号信息"))
		return
	}

	setupOK(c, gin.H{"message": "数据库连接成功"})
}

func install(c *gin.Context) {
	// TOCTOU 保护：双重检查
	if !NeedsSetup() {
		setupError(c, http.StatusForbidden, "系统已安装，不允许重复安装")
		return
	}

	var req installRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		setupError(c, http.StatusBadRequest, sanitizeSetupErrorMessage("请求参数错误: "+err.Error(), "提交的信息不完整或格式不正确，请检查后重试"))
		return
	}

	// ========== 全面输入校验 ==========

	req.Environment = strings.TrimSpace(req.Environment)
	if !isSupportedEnvironment(req.Environment) {
		setupError(c, http.StatusBadRequest, "安装环境无效，仅支持 dev / test / prod")
		return
	}

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
	req.Database.SSLMode = "disable"

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
		Environment: req.Environment,
		Database:    req.Database,
		Admin:       req.Admin,
	}

	if err := installSetup(cfg); err != nil {
		setupError(c, http.StatusInternalServerError, "安装未完成，请检查配置后重试")
		return
	}

	// 安装完成后延迟自重启，切换到正式模式。
	// 不能依赖 air/docker/systemd 猜测外部会自动拉起新进程，否则本地开发会卡死在 setup 模式。
	if err := scheduleSetupRestart(); err != nil {
		setupError(c, http.StatusInternalServerError, "安装已完成，请手动重启服务后继续")
		return
	}

	setupOK(c, gin.H{
		"message": "安装成功！服务将自动重启...",
		"restart": true,
	})
}

type setupRestartPlan struct {
	executable string
	args       []string
	env        []string
}

func buildSetupRestartPlan() (*setupRestartPlan, error) {
	executable, err := os.Executable()
	if err != nil {
		return nil, fmt.Errorf("解析当前可执行文件失败: %w", err)
	}

	args := make([]string, 0, len(os.Args))
	args = append(args, executable)
	if len(os.Args) > 1 {
		args = append(args, os.Args[1:]...)
	}

	return &setupRestartPlan{
		executable: executable,
		args:       args,
		env:        append([]string{}, os.Environ()...),
	}, nil
}
