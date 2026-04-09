package devctl

import (
	"errors"
	"fmt"

	"github.com/spf13/cobra"
)

func withAppRun(run func(*App, *cobra.Command, []string) error) func(*cobra.Command, []string) error {
	return func(cmd *cobra.Command, args []string) error {
		app, err := loadApp()
		if err != nil {
			return err
		}
		return run(app, cmd, args)
	}
}

func newRenameCommand() *cobra.Command {
	var dryRun bool
	var yes bool
	command := &cobra.Command{
		Use:   "rename <brand>",
		Short: "批量重命名仓库内品牌与命名空间",
		Args:  cobra.ExactArgs(1),
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runBrandRename(args[0], renameOptions{
				DryRun: dryRun,
				Yes:    yes,
				Out:    cmd.OutOrStdout(),
			})
		}),
	}
	command.Flags().BoolVar(&dryRun, "dry-run", false, "仅预览将修改的文件，不实际写入")
	command.Flags().BoolVar(&yes, "yes", false, "跳过确认直接执行")
	return command
}

func newSetPrefixCommand() *cobra.Command {
	var reset bool
	command := &cobra.Command{
		Use:   "set-prefix <project-prefix>",
		Short: "设置或重置本地默认项目前缀",
		Args: func(cmd *cobra.Command, args []string) error {
			if reset {
				return nil
			}
			if len(args) != 1 {
				return errors.New("请传入新的 project prefix，或使用 --reset")
			}
			return nil
		},
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			next := ""
			if len(args) > 0 {
				next = args[0]
			}
			return app.renameProjectPrefix(next, reset, cmd.OutOrStdout())
		}),
	}
	command.Flags().BoolVar(&reset, "reset", false, "清除本地默认项目前缀覆盖")
	return command
}

func newTypecheckCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "typecheck",
		Short: "执行前端类型检查",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runTypecheck()
		}),
	}
}

func newDockerUpCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "docker-up",
		Short: "启动应用 compose 栈",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runDockerUp()
		}),
	}
}

func newDockerDownCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "docker-down",
		Short: "停止应用 compose 栈",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runDockerDown()
		}),
	}
}

func newDeployCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "deploy",
		Short: "构建 Docker 镜像并启动应用栈",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runDeploy()
		}),
	}
}

func newEnvPrintCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "env-print",
		Short: "兼容旧 make 的环境摘要命令",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			app.printEnv()
			return nil
		}),
	}
}

func newInitCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "init",
		Short: "兼容旧 make init，安装依赖并生成 OpenAPI",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runSetup(true, true, cmd.OutOrStdout())
		}),
	}
}

func newInfraUpCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "infra-up",
		Short: "启动 PostgreSQL 与 Redis 开发基础设施",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			services, err := normalizeServiceList(app, []string{"postgres", "redis"})
			if err != nil {
				return err
			}
			return app.StartServices(services, cmd.OutOrStdout())
		}),
	}
}

func newKillCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "kill",
		Short: "停止所有受管服务",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			services, err := normalizeServiceList(app, []string{"all"})
			if err != nil {
				return err
			}
			return app.StopServices(services, cmd.OutOrStdout())
		}),
	}
}

func newCheckDevPortsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "check-dev-ports",
		Short: "检查开发端口是否已被占用",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			conflicts := make([]string, 0)
			for _, service := range allServices(app) {
				if service.Port == 0 {
					continue
				}
				if portOpen(service.Port) {
					conflicts = append(conflicts, fmt.Sprintf("%s 端口 %d 已被占用", service.Label, service.Port))
				}
			}
			if len(conflicts) == 0 {
				fmt.Fprintln(cmd.OutOrStdout(), "所有开发端口均可用")
				return nil
			}
			for _, line := range conflicts {
				fmt.Fprintln(cmd.OutOrStdout(), line)
			}
			return errors.New("请先释放占用端口后再重试")
		}),
	}
}

func newPrepareGoEnvCommand() *cobra.Command {
	return &cobra.Command{
		Use:    "prepare-go-env",
		Short:  "准备 Go 缓存与可执行目录",
		Hidden: true,
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			for _, dir := range []string{app.GoBinDir, app.GoCacheDir, app.GoModCacheDir} {
				if err := ensureDir(dir); err != nil {
					return err
				}
			}
			fmt.Fprintln(cmd.OutOrStdout(), "Go 环境目录已准备完成")
			return nil
		}),
	}
}

func newLegacyDepsCommand(target string) *cobra.Command {
	return &cobra.Command{
		Use:   "deps-" + target,
		Short: "兼容旧 make deps-" + target,
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runDeps(target)
		}),
	}
}

func newLegacyBuildCommand(target string) *cobra.Command {
	return &cobra.Command{
		Use:   "build-" + target,
		Short: "兼容旧 make build-" + target,
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runBuild(target)
		}),
	}
}

func newLegacyTestCommand(target string) *cobra.Command {
	return &cobra.Command{
		Use:   "test-" + target,
		Short: "兼容旧 make test-" + target,
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runTest(target)
		}),
	}
}

func newLegacyDevCommand(service string) *cobra.Command {
	return &cobra.Command{
		Use:   "dev-" + service,
		Short: "兼容旧 make dev-" + service,
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			services, err := normalizeServiceList(app, []string{service})
			if err != nil {
				return err
			}
			return app.StartServices(services, cmd.OutOrStdout())
		}),
	}
}

func newDBMigrateCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "db-migrate",
		Short: "兼容旧 make db-migrate",
		RunE: withAppRun(func(app *App, cmd *cobra.Command, args []string) error {
			return app.runMigrate()
		}),
	}
}
