package bootstrap

import (
	"testing"

	"gorm.io/gorm"
)

func TestRunDatabaseBootstrapCreatesMigrationTableAndRunsMigrations(t *testing.T) {
	originalRunner := runRegisteredMigrations
	originalAutoMigrate := autoMigrateMigrationTable
	t.Cleanup(func() {
		runRegisteredMigrations = originalRunner
		autoMigrateMigrationTable = originalAutoMigrate
	})

	autoMigrateCalled := false
	called := false
	autoMigrateMigrationTable = func(db *gorm.DB) error {
		autoMigrateCalled = true
		return nil
	}
	runRegisteredMigrations = func(db *gorm.DB) error {
		called = true
		return nil
	}

	if err := RunDatabaseBootstrap(&gorm.DB{}); err != nil {
		t.Fatalf("bootstrap failed: %v", err)
	}

	if !autoMigrateCalled {
		t.Fatal("expected migration table initialization to run")
	}

	if !called {
		t.Fatal("expected registered migrations to run")
	}
}
