package devctl

import (
	"errors"

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

func newDoctorCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "doctor",
		Short: "检查本地开发依赖",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.doctor()
		},
	}
}

func newStatusCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "查看受管服务状态",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.printStatus()
		},
	}
}

func newEnvCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "env",
		Short: "打印开发环境摘要",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			app.printEnv()
			return nil
		},
	}
}

func newSetupStatusCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "setup-status",
		Short: "检查当前是否会进入 Setup Wizard",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			app.printSetupStatus()
			return nil
		},
	}
}

func newSetupCommand() *cobra.Command {
	var withOpenAPI bool
	var skipInfra bool
	command := &cobra.Command{
		Use:   "setup",
		Short: "执行开发环境初始化",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runSetup(withOpenAPI, skipInfra, cmd.OutOrStdout())
		},
	}
	command.Flags().BoolVar(&withOpenAPI, "with-openapi", false, "初始化时额外执行 openapi 同步")
	command.Flags().BoolVar(&skipInfra, "skip-infra", false, "跳过 PostgreSQL / Redis 开发基础设施启动")
	return command
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

func newServiceCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "service",
		Short: "启动、停止、重启或查看服务日志",
	}
	cmd.AddCommand(
		newServiceStartCommand(),
		newServiceStopCommand(),
		newServiceRestartCommand(),
		newServiceLogsCommand(),
	)
	return cmd
}

func newServiceStartCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "start [services...]",
		Short: "启动一个或多个服务",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			services, err := normalizeServiceList(app, args)
			if err != nil {
				return err
			}
			return app.StartServices(services, cmd.OutOrStdout())
		},
	}
}

func newServiceStopCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "stop [services...]",
		Short: "停止一个或多个服务",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			services, err := normalizeServiceList(app, args)
			if err != nil {
				return err
			}
			return app.StopServices(services, cmd.OutOrStdout())
		},
	}
}

func newServiceRestartCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "restart [services...]",
		Short: "重启一个或多个服务",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			services, err := normalizeServiceList(app, args)
			if err != nil {
				return err
			}
			return app.RestartServices(services, cmd.OutOrStdout())
		},
	}
}

func newServiceLogsCommand() *cobra.Command {
	var lines int
	command := &cobra.Command{
		Use:   "logs <service>",
		Short: "查看服务日志",
		Args: func(cmd *cobra.Command, args []string) error {
			if len(args) != 1 {
				return errors.New("请指定单个服务名")
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.printServiceLogs(args[0], lines, cmd.OutOrStdout())
		},
	}
	command.Flags().IntVar(&lines, "lines", 120, "输出最后 N 行")
	return command
}

func newDepsCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "deps backend|frontend|all",
		Short: "安装依赖",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runDeps(args[0])
		},
	}
}

func newBuildCommand() *cobra.Command {
	var dockerFile string
	var dockerTags []string
	var dockerPush bool
	command := &cobra.Command{
		Use:   "build backend|admin|mobile|showcase|frontend|docker|all",
		Short: "执行构建",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			if args[0] == "docker" {
				return app.runDockerBuild(dockerTags, dockerFile, dockerPush)
			}
			return app.runBuild(args[0])
		},
	}
	command.Flags().StringVar(&dockerFile, "file", "Dockerfile", "Docker 构建使用的 Dockerfile 路径")
	command.Flags().StringArrayVar(&dockerTags, "tag", nil, "Docker 镜像标签，可重复传入")
	command.Flags().BoolVar(&dockerPush, "push", false, "构建完成后推送镜像")
	return command
}

func newTestCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "test backend|frontend|all",
		Short: "执行测试",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runTest(args[0])
		},
	}
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

func newOpenAPICommand() *cobra.Command {
	return &cobra.Command{
		Use:   "openapi",
		Short: "生成 Swagger 并同步前端 API",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runOpenAPI()
		},
	}
}

func newFmtCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "fmt",
		Short: "格式化 Go 代码",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runFmt()
		},
	}
}

func newMigrateCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "migrate",
		Short: "运行数据库迁移",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runMigrate()
		},
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

func newReinitCommand() *cobra.Command {
	var yes bool
	command := &cobra.Command{
		Use:   "reinit",
		Short: "重置本地开发环境",
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runReinit(yes)
		},
	}
	command.Flags().BoolVar(&yes, "yes", false, "跳过确认")
	return command
}

func newAgentCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:    "agent",
		Short:  "内部命令",
		Hidden: true,
	}
	runService := &cobra.Command{
		Use:    "run-service <service>",
		Hidden: true,
		Args:   cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return app.runAgentService(args[0])
		},
	}
	cmd.AddCommand(runService)
	return cmd
}
