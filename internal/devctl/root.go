package devctl

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	rootConfigFile    string
	rootProjectPrefix string
	rootRepoRoot      string
)

func Execute() {
	if err := newRootCommand().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func newRootCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:           "devctl",
		Short:         "go-admin 开发与运维工具",
		SilenceUsage:  true,
		SilenceErrors: true,
		RunE: func(cmd *cobra.Command, args []string) error {
			app, err := loadApp()
			if err != nil {
				return err
			}
			return runTUIProgram(app)
		},
	}

	cmd.PersistentFlags().StringVar(&rootConfigFile, "config", "config/settings.pg.yml", "后端配置文件路径")
	cmd.PersistentFlags().StringVar(&rootProjectPrefix, "project-prefix", "", "覆盖默认 docker 项目前缀")
	cmd.PersistentFlags().StringVar(&rootRepoRoot, "repo-root", "", "仓库根目录（内部使用）")
	_ = cmd.PersistentFlags().MarkHidden("repo-root")

	cmd.AddCommand(
		newTUICommand(),
		newDoctorCommand(),
		newSetupCommand(),
		newRenameCommand(),
		newSetPrefixCommand(),
		newStatusCommand(),
		newEnvCommand(),
		newEnvPrintCommand(),
		newSetupStatusCommand(),
		newInitCommand(),
		newInfraUpCommand(),
		newKillCommand(),
		newCheckDevPortsCommand(),
		newPrepareGoEnvCommand(),
		newServiceCommand(),
		newLegacyDevCommand("backend"),
		newLegacyDevCommand("admin"),
		newLegacyDevCommand("mobile"),
		newLegacyDevCommand("showcase"),
		newDepsCommand(),
		newLegacyDepsCommand("backend"),
		newLegacyDepsCommand("frontend"),
		newBuildCommand(),
		newLegacyBuildCommand("backend"),
		newLegacyBuildCommand("admin"),
		newLegacyBuildCommand("mobile"),
		newLegacyBuildCommand("showcase"),
		newLegacyBuildCommand("frontend"),
		newLegacyBuildCommand("docker"),
		newTestCommand(),
		newLegacyTestCommand("backend"),
		newLegacyTestCommand("frontend"),
		newLegacyTestCommand("all"),
		newTypecheckCommand(),
		newOpenAPICommand(),
		newFmtCommand(),
		newMigrateCommand(),
		newDBMigrateCommand(),
		newDockerUpCommand(),
		newDockerDownCommand(),
		newDeployCommand(),
		newReinitCommand(),
		newAgentCommand(),
	)

	return cmd
}

func loadApp() (*App, error) {
	return NewApp(AppOptions{
		ConfigFile:    rootConfigFile,
		ProjectPrefix: rootProjectPrefix,
		RepoRoot:      rootRepoRoot,
	})
}
