package bootstrap

import (
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

// RunDatabaseBootstrap 初始化迁移记录表并执行已注册迁移。
func RunDatabaseBootstrap(db *gorm.DB) error {
	if err := autoMigrateMigrationTable(db); err != nil {
		return err
	}
	return runRegisteredMigrations(db)
}
