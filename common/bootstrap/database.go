package bootstrap

import (
	"fmt"
	"sort"

	"github.com/go-admin-team/go-admin-core/sdk"
	sdkConfig "github.com/go-admin-team/go-admin-core/sdk/config"
	"go-admin/cmd/migrate/migration"
	_ "go-admin/cmd/migrate/migration/version"
	_ "go-admin/cmd/migrate/migration/version-local"
	"go-admin/common/models"

	"gorm.io/gorm"
)

var runRegisteredMigrations = func(db *gorm.DB) error {
	migration.Migrate.SetDb(db)
	return migration.Migrate.Migrate()
}

var autoMigrateMigrationTable = func(db *gorm.DB) error {
	return db.AutoMigrate(&models.Migration{})
}

var getRuntimeDBByKey = func(host string) *gorm.DB {
	return sdk.Runtime.GetDbByKey(host)
}

var getRuntimeDBs = func() map[string]*gorm.DB {
	return sdk.Runtime.GetDb()
}

var getRuntimeDatabaseDriver = func(host string) string {
	cfg, ok := sdkConfig.DatabasesConfig[host]
	if !ok || cfg == nil {
		return ""
	}
	return cfg.Driver
}

var runBootstrap = func(db *gorm.DB) error {
	return RunDatabaseBootstrap(db)
}

// RunDatabaseBootstrap 初始化迁移记录表并执行已注册迁移。
func RunDatabaseBootstrap(db *gorm.DB) error {
	if err := autoMigrateMigrationTable(db); err != nil {
		return err
	}
	return runRegisteredMigrations(db)
}

// RunRuntimeDatabaseBootstrap 复用运行时已建立的数据库连接执行迁移。
// host 为空时沿用 migrate 命令约定的 "*" 选择逻辑。
func RunRuntimeDatabaseBootstrap(host string) error {
	resolvedHost, db, err := resolveRuntimeBootstrapDB(host)
	if err != nil {
		return err
	}
	return runBootstrap(prepareRuntimeBootstrapDB(resolvedHost, db))
}

// RunRuntimeDatabaseBootstrapAll 对当前已注册的全部数据库执行幂等迁移检查。
func RunRuntimeDatabaseBootstrapAll() error {
	dbs := getRuntimeDBs()
	if len(dbs) == 0 {
		return fmt.Errorf("未找到数据库配置")
	}

	hosts := make([]string, 0, len(dbs))
	for host := range dbs {
		hosts = append(hosts, host)
	}
	sort.Strings(hosts)

	for _, host := range hosts {
		db := dbs[host]
		if db == nil {
			return fmt.Errorf("数据库 %s 未初始化", host)
		}
		if err := runBootstrap(prepareRuntimeBootstrapDB(host, db)); err != nil {
			return fmt.Errorf("数据库 %s 迁移失败: %w", host, err)
		}
	}

	return nil
}

func resolveRuntimeBootstrapDB(host string) (string, *gorm.DB, error) {
	if host == "" {
		host = "*"
	}

	db := getRuntimeDBByKey(host)
	if db == nil && host == "*" {
		dbs := getRuntimeDBs()
		if len(dbs) == 1 {
			for key, value := range dbs {
				host = key
				db = value
				break
			}
		}
	}
	if db == nil {
		return "", nil, fmt.Errorf("未找到数据库配置")
	}
	return host, db, nil
}

func prepareRuntimeBootstrapDB(host string, db *gorm.DB) *gorm.DB {
	workingDB := db
	if getRuntimeDatabaseDriver(host) == "mysql" {
		workingDB = workingDB.Set("gorm:table_options", "ENGINE=InnoDB CHARSET=utf8mb4")
	}
	return workingDB
}
