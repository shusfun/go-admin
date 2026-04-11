package bootstrap

import (
	"errors"
	"testing"

	"github.com/glebarez/sqlite"
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

func TestRunRuntimeDatabaseBootstrapFallsBackToSingleRegisteredDatabase(t *testing.T) {
	originalGetByKey := getRuntimeDBByKey
	originalGetDBs := getRuntimeDBs
	originalGetDriver := getRuntimeDatabaseDriver
	originalRunBootstrap := runBootstrap
	t.Cleanup(func() {
		getRuntimeDBByKey = originalGetByKey
		getRuntimeDBs = originalGetDBs
		getRuntimeDatabaseDriver = originalGetDriver
		runBootstrap = originalRunBootstrap
	})

	expected := mustOpenTestDB(t)
	getRuntimeDBByKey = func(host string) *gorm.DB {
		return nil
	}
	getRuntimeDBs = func() map[string]*gorm.DB {
		return map[string]*gorm.DB{
			"tenant-a": expected,
		}
	}
	getRuntimeDatabaseDriver = func(host string) string {
		if host != "tenant-a" {
			t.Fatalf("unexpected host: %s", host)
		}
		return "postgres"
	}

	called := false
	runBootstrap = func(db *gorm.DB) error {
		called = true
		if db == nil {
			t.Fatal("expected bootstrap db")
		}
		return nil
	}

	if err := RunRuntimeDatabaseBootstrap("*"); err != nil {
		t.Fatalf("runtime bootstrap failed: %v", err)
	}
	if !called {
		t.Fatal("expected runtime bootstrap to run")
	}
}

func TestRunRuntimeDatabaseBootstrapAllReturnsWrappedHostError(t *testing.T) {
	originalGetDBs := getRuntimeDBs
	originalGetDriver := getRuntimeDatabaseDriver
	originalRunBootstrap := runBootstrap
	t.Cleanup(func() {
		getRuntimeDBs = originalGetDBs
		getRuntimeDatabaseDriver = originalGetDriver
		runBootstrap = originalRunBootstrap
	})

	getRuntimeDBs = func() map[string]*gorm.DB {
		return map[string]*gorm.DB{
			"tenant-a": mustOpenTestDB(t),
			"tenant-b": mustOpenTestDB(t),
		}
	}
	getRuntimeDatabaseDriver = func(host string) string {
		return "postgres"
	}
	runBootstrap = func(db *gorm.DB) error {
		return errors.New("boom")
	}

	err := RunRuntimeDatabaseBootstrapAll()
	if err == nil {
		t.Fatal("expected wrapped error")
	}
	if got := err.Error(); got != "数据库 tenant-a 迁移失败: boom" {
		t.Fatalf("unexpected error: %s", got)
	}
}

func mustOpenTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open test db failed: %v", err)
	}
	return db
}
