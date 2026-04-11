package version

import (
	"runtime"

	"go-admin/cmd/migrate/migration"
	"go-admin/cmd/migrate/migration/models"
	common "go-admin/common/models"

	"gorm.io/gorm"
)

func init() {
	_, fileName, _, _ := runtime.Caller(0)
	migration.Migrate.SetVersion(migration.GetFilename(fileName), _1712476801000RemoveCodegenFormbuilder)
}

func _1712476801000RemoveCodegenFormbuilder(db *gorm.DB, version string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		apiPaths := []string{
			"/api/v1/db/tables/page",
			"/api/v1/db/columns/page",
			"/api/v1/gen/toproject/:tableId",
			"/api/v1/gen/todb/:tableId",
			"/api/v1/gen/tabletree",
			"/api/v1/gen/preview/:tableId",
			"/api/v1/gen/apitofile/:tableId",
			"/api/v1/sys/tables/info",
			"/api/v1/sys/tables/info/:tableId",
			"/api/v1/sys/tables/page",
			"/form-generator/*filepath",
		}
		menuPaths := []string{
			"/dev-tools/build",
			"/dev-tools/gen",
			"/dev-tools/editTable",
		}

		var apiIDs []int
		if err := tx.Model(&models.SysApi{}).Where("path IN ?", apiPaths).Pluck("id", &apiIDs).Error; err != nil {
			return err
		}
		var menuIDs []int
		if err := tx.Model(&models.SysMenu{}).Where("path IN ?", menuPaths).Pluck("menu_id", &menuIDs).Error; err != nil {
			return err
		}

		if len(apiIDs) > 0 {
			if err := tx.Table("sys_menu_api_rule").Where("sys_api_id IN ?", apiIDs).Delete(nil).Error; err != nil {
				return err
			}
			if err := tx.Where("path IN ?", apiPaths).Delete(&models.SysApi{}).Error; err != nil {
				return err
			}
		}
		if len(menuIDs) > 0 {
			if err := tx.Table("sys_menu_api_rule").Where("sys_menu_menu_id IN ?", menuIDs).Delete(nil).Error; err != nil {
				return err
			}
			if err := tx.Where("path IN ?", menuPaths).Delete(&models.SysMenu{}).Error; err != nil {
				return err
			}
		}

		if tx.Migrator().HasTable(&models.SysColumns{}) {
			if err := tx.Migrator().DropTable(&models.SysColumns{}); err != nil {
				return err
			}
		}
		if tx.Migrator().HasTable(&models.SysTables{}) {
			if err := tx.Migrator().DropTable(&models.SysTables{}); err != nil {
				return err
			}
		}

		return tx.Create(&common.Migration{
			Version: version,
		}).Error
	})
}
