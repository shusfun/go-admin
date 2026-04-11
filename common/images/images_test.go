package images

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestBuildVariantPath(t *testing.T) {
	path := BuildVariantPath("/static/uploadfile/avatar/demo.webp", 128)
	if path != "/static/uploadfile/avatar/demo@128.webp" {
		t.Fatalf("unexpected variant path: %s", path)
	}
}

func TestNormalizePathPreservesAbsoluteURL(t *testing.T) {
	path := NormalizePath("https://example.com/avatar.webp")
	if path != "https://example.com/avatar.webp" {
		t.Fatalf("unexpected normalized path: %s", path)
	}
}

func TestSaveAvatarFromReader(t *testing.T) {
	workspace, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd failed: %v", err)
	}

	testDir := filepath.Join(workspace, ".tmp-avatar-test")
	if err := os.MkdirAll(testDir, 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	defer os.RemoveAll(testDir)

	originalWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd failed: %v", err)
	}
	if err := os.Chdir(testDir); err != nil {
		t.Fatalf("chdir failed: %v", err)
	}
	defer os.Chdir(originalWd)

	img := image.NewRGBA(image.Rect(0, 0, 900, 600))
	for y := 0; y < 600; y++ {
		for x := 0; x < 900; x++ {
			img.Set(x, y, color.RGBA{R: uint8(x % 255), G: uint8(y % 255), B: 120, A: 255})
		}
	}

	var buffer bytes.Buffer
	if err := png.Encode(&buffer, img); err != nil {
		t.Fatalf("encode png failed: %v", err)
	}

	asset, err := SaveAvatarFromReader(bytes.NewReader(buffer.Bytes()), "avatar-unit")
	if err != nil {
		t.Fatalf("save avatar failed: %v", err)
	}

	if asset.Path != "/static/uploadfile/avatar/avatar-unit.webp" {
		t.Fatalf("unexpected master path: %s", asset.Path)
	}
	if asset.Size != 512 {
		t.Fatalf("unexpected master size: %d", asset.Size)
	}
	if len(asset.Variants) != 3 {
		t.Fatalf("unexpected variants length: %d", len(asset.Variants))
	}

	expectedFiles := []string{
		"static/uploadfile/avatar/avatar-unit.webp",
		"static/uploadfile/avatar/avatar-unit@64.webp",
		"static/uploadfile/avatar/avatar-unit@128.webp",
		"static/uploadfile/avatar/avatar-unit@256.webp",
	}
	for _, file := range expectedFiles {
		if _, err := os.Stat(file); err != nil {
			t.Fatalf("expected file missing %s: %v", file, err)
		}
	}

	for _, variant := range asset.Variants {
		if !strings.Contains(variant.Path, "@") {
			t.Fatalf("variant path missing suffix: %s", variant.Path)
		}
	}

	restored := AssetFromPath(asset.Path)
	if restored == nil {
		t.Fatalf("asset from path should not be nil")
	}
	if restored.Size != 512 {
		t.Fatalf("unexpected restored size: %d", restored.Size)
	}
	if len(restored.Variants) != 3 {
		t.Fatalf("unexpected restored variants length: %d", len(restored.Variants))
	}
}
