package api

import (
	"errors"
	"testing"

	ext "go-admin/config"
)

func TestSetupRunsStartupBootstrapWhenEnabled(t *testing.T) {
	previousLoadRuntimeConfig := loadRuntimeConfig
	previousRunStartupDatabaseBootstrap := runStartupDatabaseBootstrap
	previousStartRuntimeQueue := startRuntimeQueue
	previousExtConfig := ext.ExtConfig
	t.Cleanup(func() {
		loadRuntimeConfig = previousLoadRuntimeConfig
		runStartupDatabaseBootstrap = previousRunStartupDatabaseBootstrap
		startRuntimeQueue = previousStartRuntimeQueue
		ext.ExtConfig = previousExtConfig
	})

	loadRuntimeConfig = func() {
		ext.ExtConfig.Runtime.AutoMigrateOnStart = true
	}
	bootstrapCalled := false
	runStartupDatabaseBootstrap = func() error {
		bootstrapCalled = true
		return nil
	}
	startRuntimeQueue = func() {}

	if err := setup(); err != nil {
		t.Fatalf("setup failed: %v", err)
	}
	if !bootstrapCalled {
		t.Fatal("expected startup bootstrap to run when autoMigrateOnStart=true")
	}
}

func TestSetupSkipsStartupBootstrapWhenDisabled(t *testing.T) {
	previousLoadRuntimeConfig := loadRuntimeConfig
	previousRunStartupDatabaseBootstrap := runStartupDatabaseBootstrap
	previousStartRuntimeQueue := startRuntimeQueue
	previousExtConfig := ext.ExtConfig
	t.Cleanup(func() {
		loadRuntimeConfig = previousLoadRuntimeConfig
		runStartupDatabaseBootstrap = previousRunStartupDatabaseBootstrap
		startRuntimeQueue = previousStartRuntimeQueue
		ext.ExtConfig = previousExtConfig
	})

	loadRuntimeConfig = func() {
		ext.ExtConfig.Runtime.AutoMigrateOnStart = false
	}
	bootstrapCalled := false
	runStartupDatabaseBootstrap = func() error {
		bootstrapCalled = true
		return nil
	}
	startRuntimeQueue = func() {}

	if err := setup(); err != nil {
		t.Fatalf("setup failed: %v", err)
	}
	if bootstrapCalled {
		t.Fatal("expected startup bootstrap to be skipped when autoMigrateOnStart=false")
	}
}

func TestSetupWrapsStartupBootstrapError(t *testing.T) {
	previousLoadRuntimeConfig := loadRuntimeConfig
	previousRunStartupDatabaseBootstrap := runStartupDatabaseBootstrap
	previousStartRuntimeQueue := startRuntimeQueue
	previousExtConfig := ext.ExtConfig
	t.Cleanup(func() {
		loadRuntimeConfig = previousLoadRuntimeConfig
		runStartupDatabaseBootstrap = previousRunStartupDatabaseBootstrap
		startRuntimeQueue = previousStartRuntimeQueue
		ext.ExtConfig = previousExtConfig
	})

	loadRuntimeConfig = func() {
		ext.ExtConfig.Runtime.AutoMigrateOnStart = true
	}
	runStartupDatabaseBootstrap = func() error {
		return errors.New("migration boom")
	}
	startRuntimeQueue = func() {}

	err := setup()
	if err == nil {
		t.Fatal("expected setup to fail when startup bootstrap fails")
	}
	if got := err.Error(); got != "startup database bootstrap failed: migration boom" {
		t.Fatalf("unexpected error: %s", got)
	}
}
