package config

var ExtConfig Extend

// Extend 扩展配置
//
//	extend:
//	  demo:
//	    name: demo-name
//
// 使用方法： config.ExtConfig......即可！！
type Extend struct {
	AMap    AMap          // 这里配置对应配置文件的结构即可
	Runtime RuntimeConfig `yaml:"runtime"`
	Ops     OpsConfig     `yaml:"ops"`
}

type AMap struct {
	Key string
}

type RuntimeConfig struct {
	AutoMigrateOnStart bool `yaml:"autoMigrateOnStart"`
}

type OpsConfig struct {
	TaskTimeoutSeconds int              `yaml:"taskTimeoutSeconds"`
	Environments       []OpsEnvironment `yaml:"environments"`
}

type OpsEnvironment struct {
	Key                string            `yaml:"key"`
	Name               string            `yaml:"name"`
	Enabled            bool              `yaml:"enabled"`
	Domain             string            `yaml:"domain"`
	ConfirmName        bool              `yaml:"confirmName"`
	TaskTimeoutSeconds int               `yaml:"taskTimeoutSeconds"`
	Backend            OpsBackendTarget  `yaml:"backend"`
	Frontend           OpsFrontendTarget `yaml:"frontend"`
}

type OpsBackendTarget struct {
	RepoDir     string `yaml:"repoDir"`
	ComposeFile string `yaml:"composeFile"`
	ServiceName string `yaml:"serviceName"`
	HealthURL   string `yaml:"healthURL"`
}

type OpsFrontendTarget struct {
	RepoDir     string `yaml:"repoDir"`
	DistDir     string `yaml:"distDir"`
	PublishDir  string `yaml:"publishDir"`
	ReloadNginx bool   `yaml:"reloadNginx"`
}
