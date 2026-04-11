export function printHelp() {
  const sections = [
    {
      title: "推荐快捷入口",
      lines: [
        "pnpm repo:infra:start               启动基础设施",
        "pnpm repo:infra:stop                停止基础设施",
        "pnpm repo:infra:status              查看基础设施状态",
        "pnpm repo:service:start backend     启动后端",
        "pnpm repo:service:start:backend     启动后端（全冒号别名）",
        "pnpm repo:service:status backend    查看单个服务状态",
        "pnpm repo:service:start admin       启动管理端",
        "pnpm repo:service:start mobile      启动移动端",
        "pnpm repo:service:stop all          停止全部应用服务",
        "pnpm repo:service:logs backend      查看后端日志",
        "pnpm repo:deps all                  安装全部依赖",
        "pnpm repo:build backend             构建指定目标",
        "pnpm repo:verify backend            校验指定目标",
      ],
    },
    {
      title: "等价原生命令",
      lines: [
        "repo infra start          自动探测并启动开发基础设施（Homebrew / Docker）",
        "repo infra stop           停止当前基础设施来源",
        "repo infra status         查看基础设施来源、运行状态和健康状态",
      ],
    },
    {
      title: "应用服务",
      lines: [
        "repo service start backend   启动后端（非 Windows 使用 air，Windows 使用静默原生热更新）",
        "repo service status backend  查看单个服务状态",
        "repo service start admin     启动管理端",
        "repo service start mobile    启动移动端",
        "repo service stop all        停止全部应用服务",
        "repo service logs <service>  查看服务日志",
      ],
    },
    {
      title: "常用命令",
      lines: [
        "repo doctor               检查 go/node/pnpm/brew/docker",
        "repo env                  打印当前配置文件、端口和工作目录",
        "repo status               查看应用服务和基础设施状态",
        "repo setup                安装依赖并准备开发环境",
        "repo setup-status         查看是否会进入 Setup Wizard",
        "repo db reset             重置当前项目数据库内容",
        "repo migrate              执行数据库迁移",
        "repo openapi              生成 OpenAPI 与前端类型",
        "repo reinit --yes         重置本地产物、安装态和项目数据库",
      ],
    },
    {
      title: "全局参数",
      lines: [
        "--config <path>           指定后端配置文件",
        "--project-prefix <name>   指定 Docker 项目前缀",
        "--repo-root <path>        指定仓库根目录",
      ],
    },
  ];

  console.log("用法: repo <command> [args...]");
  console.log("规则: 固定命令链使用 ':' 连接，最后的动态参数保持空格传入");
  console.log("例如: repo service start backend => pnpm repo:service:start backend");
  console.log("补充: 常用命令也提供 pnpm repo:service:start:backend 这类全冒号别名");
  console.log("");
  for (const section of sections) {
    console.log(section.title);
    for (const line of section.lines) {
      console.log(`  ${line}`);
    }
    console.log("");
  }
  console.log("查看帮助：pnpm repo:help");
}
