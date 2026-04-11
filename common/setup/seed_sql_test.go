package setup

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestSeedSQLDoesNotCreateDefaultAdminUser(t *testing.T) {
	t.Helper()

	dbSQL := mustReadRepoFile(t, "config", "db.sql")
	if strings.Contains(dbSQL, "INSERT INTO sys_user") {
		t.Fatal("expected setup architecture to remove default admin user seed from config/db.sql")
	}

	sqlServerSQL := mustReadRepoFile(t, "config", "db-sqlserver.sql")
	if strings.Contains(sqlServerSQL, "INSERT INTO sys_user") {
		t.Fatal("expected setup architecture to remove default admin user seed from config/db-sqlserver.sql")
	}
}

func TestPostgresUserSequenceStartsFromSetupCreatedAdmin(t *testing.T) {
	t.Helper()

	pgSQL := mustReadRepoFile(t, "config", "pg.sql")
	if !strings.Contains(pgSQL, "select setval('sys_user_user_id_seq',1,false);") {
		t.Fatal("expected postgres sys_user sequence to start from setup-created admin")
	}
}

func mustReadRepoFile(t *testing.T, elems ...string) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path failed")
	}

	path := filepath.Join(append([]string{filepath.Dir(currentFile), "..", ".."}, elems...)...)
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s failed: %v", path, err)
	}
	return string(content)
}
