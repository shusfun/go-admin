package devctl

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

type renameOptions struct {
	DryRun bool
	Yes    bool
	Out    io.Writer
}

type renameRule struct {
	label string
	apply func(path string, data []byte) ([]byte, bool, error)
}

type renamePlan struct {
	OldRoot  string
	NewRoot  string
	OldScope string
	NewScope string
	Files    []string
}

func (a *App) runBrandRename(brand string, opts renameOptions) error {
	if opts.Out == nil {
		opts.Out = os.Stdout
	}

	brand = strings.TrimSpace(brand)
	if brand == "" {
		return errors.New("brand 不能为空")
	}

	newRoot := normalizeProjectPrefix(brand)
	if newRoot == "" {
		return errors.New("brand 规范化后为空，请换一个名字")
	}

	oldRoot := a.PackageName
	oldScope, err := detectWorkspaceScope(a.RepoRoot)
	if err != nil {
		return err
	}
	if oldRoot == "" && oldScope == "" {
		return errors.New("未识别到可重命名的品牌信息")
	}

	plan, err := a.previewBrandRename(oldRoot, oldScope, newRoot)
	if err != nil {
		return err
	}
	if len(plan.Files) == 0 {
		fmt.Fprintln(opts.Out, "未发现需要重命名的文件")
		return nil
	}

	fmt.Fprintf(opts.Out, "品牌重命名计划：root %q -> %q", plan.OldRoot, plan.NewRoot)
	if plan.OldScope != "" {
		fmt.Fprintf(opts.Out, "，scope @%s -> @%s", plan.OldScope, plan.NewScope)
	}
	fmt.Fprintln(opts.Out)
	fmt.Fprintf(opts.Out, "将修改 %d 个文件\n", len(plan.Files))
	for _, path := range plan.Files {
		fmt.Fprintf(opts.Out, "  - %s\n", path)
	}

	if opts.DryRun {
		return nil
	}

	if !opts.Yes {
		if !terminalAvailable() {
			return errors.New("非交互终端执行 rename 必须显式传入 --yes")
		}
		fmt.Fprint(opts.Out, "⚠️ 将直接修改仓库内品牌相关文件，确认继续？[y/N]: ")
		reader := bufio.NewReader(os.Stdin)
		value, _ := reader.ReadString('\n')
		value = strings.TrimSpace(strings.ToLower(value))
		if value != "y" && value != "yes" {
			return errors.New("已取消 rename")
		}
	}

	if err := a.applyBrandRename(plan, opts.Out); err != nil {
		return err
	}

	_ = saveProfile(a.ProfilePath, devctlProfile{ProjectPrefix: newRoot})

	fmt.Fprintln(opts.Out, "\n==> 校验")
	if err := a.runCommand("pnpm", []string{"install", "--store-dir", "./.pnpm-store"}, RunOptions{Dir: a.RepoRoot}); err != nil {
		return fmt.Errorf("rename 后 pnpm install 失败: %w", err)
	}
	if err := a.runCommand("pnpm", []string{"typecheck"}, RunOptions{Dir: a.RepoRoot}); err != nil {
		return fmt.Errorf("rename 后 pnpm typecheck 失败: %w", err)
	}
	if err := a.runCommand("go", []string{"test", "./..."}, RunOptions{Dir: a.RepoRoot, Env: a.GoEnv()}); err != nil {
		return fmt.Errorf("rename 后 go test ./... 失败: %w", err)
	}

	fmt.Fprintln(opts.Out, "\nrename 完成")
	return nil
}

func detectWorkspaceScope(repoRoot string) (string, error) {
	counts := map[string]int{}
	err := filepath.WalkDir(filepath.Join(repoRoot, "frontend"), func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			if d.Name() == "node_modules" || d.Name() == "dist" {
				return filepath.SkipDir
			}
			return nil
		}
		if filepath.Base(path) != "package.json" {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		var payload struct {
			Name string `json:"name"`
		}
		if err := json.Unmarshal(data, &payload); err != nil {
			return nil
		}
		if strings.HasPrefix(payload.Name, "@") {
			parts := strings.SplitN(strings.TrimPrefix(payload.Name, "@"), "/", 2)
			if len(parts) == 2 && parts[0] != "" {
				counts[parts[0]]++
			}
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	best := ""
	bestCount := 0
	for key, count := range counts {
		if count > bestCount {
			best = key
			bestCount = count
		}
	}
	return best, nil
}

func (a *App) previewBrandRename(oldRoot, oldScope, newRoot string) (renamePlan, error) {
	plan := renamePlan{
		OldRoot:  oldRoot,
		NewRoot:  newRoot,
		OldScope: oldScope,
		NewScope: newRoot,
	}
	rules := buildRenameRules(oldRoot, oldScope, newRoot)
	err := filepath.WalkDir(a.RepoRoot, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			if shouldSkipRenameDir(d.Name()) {
				return filepath.SkipDir
			}
			return nil
		}
		if !shouldProcessRenameFile(path) {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if !isProbablyText(data) {
			return nil
		}
		changed, err := fileWouldChange(path, data, rules)
		if err != nil {
			return err
		}
		if changed {
			rel, _ := filepath.Rel(a.RepoRoot, path)
			plan.Files = append(plan.Files, rel)
		}
		return nil
	})
	if err != nil {
		return renamePlan{}, err
	}
	slices.Sort(plan.Files)
	return plan, nil
}

func (a *App) applyBrandRename(plan renamePlan, out io.Writer) error {
	rules := buildRenameRules(plan.OldRoot, plan.OldScope, plan.NewRoot)
	for _, rel := range plan.Files {
		path := filepath.Join(a.RepoRoot, rel)
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		updated, changed, err := applyRules(path, data, rules)
		if err != nil {
			return err
		}
		if !changed {
			continue
		}
		if err := os.WriteFile(path, updated, 0o644); err != nil {
			return err
		}
		fmt.Fprintf(out, "已更新 %s\n", rel)
	}
	return nil
}

func buildRenameRules(oldRoot, oldScope, newRoot string) []renameRule {
	rules := make([]renameRule, 0, 6)
	if oldScope != "" && oldScope != newRoot {
		oldPrefix := []byte("@" + oldScope + "/")
		newPrefix := []byte("@" + newRoot + "/")
		rules = append(rules, renameRule{
			label: "workspace scope",
			apply: func(path string, data []byte) ([]byte, bool, error) {
				updated := bytes.ReplaceAll(data, oldPrefix, newPrefix)
				return updated, !bytes.Equal(data, updated), nil
			},
		})
	}
	if oldRoot != "" && oldRoot != newRoot {
		exactToken := compileTokenPattern(oldRoot)
		moduleLine := regexp.MustCompile(`(?m)^module\s+` + regexp.QuoteMeta(oldRoot) + `$`)
		goImport := regexp.MustCompile(`"` + regexp.QuoteMeta(oldRoot) + `/`)
		directiveSlash := regexp.MustCompile(regexp.QuoteMeta(oldRoot) + `/`)
		rules = append(rules, renameRule{
			label: "plain root token",
			apply: func(path string, data []byte) ([]byte, bool, error) {
				ext := strings.ToLower(filepath.Ext(path))
				updated := data
				switch ext {
				case ".go":
					updated = moduleLine.ReplaceAll(updated, []byte("module "+newRoot))
					updated = goImport.ReplaceAll(updated, []byte(`"`+newRoot+`/`))
					updated = exactToken.ReplaceAll(updated, []byte("$1"+newRoot+"$3"))
				case ".mod":
					updated = moduleLine.ReplaceAll(updated, []byte("module "+newRoot))
					updated = exactToken.ReplaceAll(updated, []byte("$1"+newRoot+"$3"))
				default:
					updated = exactToken.ReplaceAll(updated, []byte("$1"+newRoot+"$3"))
					if ext == ".md" || ext == ".txt" || ext == ".yml" || ext == ".yaml" || ext == ".json" || ext == ".toml" {
						updated = directiveSlash.ReplaceAll(updated, []byte(newRoot+"/"))
					}
				}
				return updated, !bytes.Equal(data, updated), nil
			},
		})
	}
	return rules
}

func compileTokenPattern(token string) *regexp.Regexp {
	return regexp.MustCompile(`(^|[^A-Za-z0-9_-])(` + regexp.QuoteMeta(token) + `)([^A-Za-z0-9_-]|$)`)
}

func fileWouldChange(path string, data []byte, rules []renameRule) (bool, error) {
	_, changed, err := applyRules(path, data, rules)
	return changed, err
}

func applyRules(path string, data []byte, rules []renameRule) ([]byte, bool, error) {
	updated := data
	changed := false
	var err error
	for _, rule := range rules {
		updated, changed, err = applyOneRule(path, updated, rule, changed)
		if err != nil {
			return nil, false, err
		}
	}
	return updated, changed, nil
}

func applyOneRule(path string, data []byte, rule renameRule, alreadyChanged bool) ([]byte, bool, error) {
	updated, changed, err := rule.apply(path, data)
	if err != nil {
		return nil, alreadyChanged, err
	}
	return updated, alreadyChanged || changed, nil
}

func shouldSkipRenameDir(name string) bool {
	switch name {
	case ".git", ".tmp", "temp", "node_modules", ".pnpm-store", "vendor", "dist", ".next", ".turbo", ".idea", ".vscode":
		return true
	default:
		return false
	}
}

func shouldProcessRenameFile(path string) bool {
	base := filepath.Base(path)
	if base == "go.sum" || base == "pnpm-lock.yaml" || strings.HasSuffix(base, ".lock") {
		return false
	}
	switch strings.ToLower(filepath.Ext(path)) {
	case ".go", ".mod", ".sum", ".md", ".txt", ".json", ".yaml", ".yml", ".toml", ".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".html", ".env":
		return true
	default:
		return false
	}
}

func isProbablyText(data []byte) bool {
	if len(data) == 0 {
		return true
	}
	if bytes.IndexByte(data, 0) >= 0 {
		return false
	}
	return true
}
