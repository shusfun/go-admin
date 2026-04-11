package images

import (
	"errors"
	"fmt"
	"image"
	stddraw "image/draw"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/eringen/gowebper"
	xdraw "golang.org/x/image/draw"
	_ "golang.org/x/image/webp"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
)

const (
	MaxAvatarUploadBytes = 25 << 20
	avatarQuality        = 82
)

var AvatarVariantSizes = []int{64, 128, 256, 512}
var variantSuffixPattern = regexp.MustCompile(`@\d+$`)

type Variant struct {
	Path string `json:"path"`
	Size int    `json:"size"`
}

type Asset struct {
	Path     string    `json:"path"`
	Size     int       `json:"size"`
	Variants []Variant `json:"variants,omitempty"`
}

func NormalizePath(path string) string {
	normalized := strings.TrimSpace(path)
	if normalized == "" {
		return ""
	}
	if strings.HasPrefix(normalized, "http://") || strings.HasPrefix(normalized, "https://") || strings.HasPrefix(normalized, "//") {
		return normalized
	}
	if strings.HasPrefix(normalized, "/") {
		return normalized
	}
	return "/" + normalized
}

func BuildVariantPath(masterPath string, size int) string {
	normalized := NormalizePath(masterPath)
	if normalized == "" || size <= 0 {
		return normalized
	}

	idx := strings.LastIndex(normalized, ".")
	if idx <= strings.LastIndex(normalized, "/") {
		return normalized
	}

	basePath := normalized[:idx]
	basePath = variantSuffixPattern.ReplaceAllString(basePath, "")
	return fmt.Sprintf("%s@%d%s", basePath, size, normalized[idx:])
}

func AssetFromPath(path string) *Asset {
	normalized := NormalizePath(path)
	if normalized == "" {
		return nil
	}

	asset := &Asset{
		Path: normalized,
	}
	if size, err := readImageSize(strings.TrimPrefix(normalized, "/")); err == nil {
		asset.Size = size
	}

	if !strings.HasPrefix(normalized, "/static/uploadfile/avatar/") || !strings.HasSuffix(strings.ToLower(normalized), ".webp") {
		return asset
	}

	for _, size := range AvatarVariantSizes {
		variantPath := BuildVariantPath(normalized, size)
		if variantPath == normalized {
			continue
		}
		if _, err := os.Stat(strings.TrimPrefix(variantPath, "/")); err != nil {
			continue
		}
		asset.Variants = append(asset.Variants, Variant{Path: variantPath, Size: size})
	}
	return asset
}

func SaveAvatar(header *multipart.FileHeader, key string) (*Asset, error) {
	if header == nil {
		return nil, errors.New("头像文件不存在")
	}
	if header.Size <= 0 {
		return nil, errors.New("头像文件为空")
	}
	if header.Size > MaxAvatarUploadBytes {
		return nil, fmt.Errorf("头像大小不能超过 %d MB", MaxAvatarUploadBytes>>20)
	}

	file, err := header.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return SaveAvatarFromReader(file, key)
}

func SaveAvatarFromReader(reader io.Reader, key string) (*Asset, error) {
	if strings.TrimSpace(key) == "" {
		return nil, errors.New("头像资源标识不能为空")
	}

	decoded, _, err := image.Decode(reader)
	if err != nil {
		return nil, errors.New("不支持的图片格式")
	}

	cropped := cropSquare(decoded)
	sourceSize := cropped.Bounds().Dx()
	if sourceSize <= 0 {
		return nil, errors.New("头像图片无有效内容")
	}

	sizes := availableVariantSizes(sourceSize)
	asset := &Asset{
		Path: NormalizePath(filepath.ToSlash(filepath.Join("static", "uploadfile", "avatar", key+".webp"))),
		Size: sizes[len(sizes)-1],
	}

	if err := os.MkdirAll(filepath.Dir(strings.TrimPrefix(asset.Path, "/")), 0o755); err != nil {
		return nil, err
	}

	for _, size := range sizes {
		targetPath := asset.Path
		if size < asset.Size {
			targetPath = BuildVariantPath(asset.Path, size)
			asset.Variants = append(asset.Variants, Variant{Path: targetPath, Size: size})
		}

		if err := encodeAvatarVariant(cropped, size, strings.TrimPrefix(targetPath, "/")); err != nil {
			return nil, err
		}
	}

	return asset, nil
}

func availableVariantSizes(sourceSize int) []int {
	sizes := make([]int, 0, len(AvatarVariantSizes))
	for _, size := range AvatarVariantSizes {
		if size <= sourceSize {
			sizes = append(sizes, size)
		}
	}
	if len(sizes) == 0 {
		sizes = append(sizes, sourceSize)
	}
	return sizes
}

func cropSquare(src image.Image) *image.NRGBA {
	bounds := src.Bounds()
	side := min(bounds.Dx(), bounds.Dy())
	offsetX := bounds.Min.X + (bounds.Dx()-side)/2
	offsetY := bounds.Min.Y + (bounds.Dy()-side)/2

	dst := image.NewNRGBA(image.Rect(0, 0, side, side))
	stddraw.Draw(dst, dst.Bounds(), src, image.Point{X: offsetX, Y: offsetY}, stddraw.Src)
	return dst
}

func encodeAvatarVariant(src image.Image, size int, path string) error {
	target := resizeSquare(src, size)
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	// 统一使用纯 Go 的 WebP 编码，避免 Windows 下依赖第三方二进制或 CGO。
	return gowebper.Encode(file, target, &gowebper.Options{
		Level:   gowebper.LevelDefault,
		Quality: avatarQuality,
	})
}

func resizeSquare(src image.Image, size int) *image.NRGBA {
	bounds := src.Bounds()
	if bounds.Dx() == size && bounds.Dy() == size {
		dst := image.NewNRGBA(image.Rect(0, 0, size, size))
		stddraw.Draw(dst, dst.Bounds(), src, bounds.Min, stddraw.Src)
		return dst
	}

	dst := image.NewNRGBA(image.Rect(0, 0, size, size))
	xdraw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, stddraw.Over, nil)
	return dst
}

func readImageSize(path string) (int, error) {
	file, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer file.Close()

	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return 0, err
	}
	return max(config.Width, config.Height), nil
}
