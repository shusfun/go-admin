package apis

func userFacingApiErrorMessage(code int) string {
	switch code {
	case 400, 422:
		return "提交的信息有误，请检查后重试"
	case 401:
		return "登录状态已失效，请重新登录"
	case 404:
		return "未找到对应任务或环境"
	case 409:
		return "当前状态下暂时无法完成此操作，请刷新后重试"
	case 503:
		return "服务正在处理中，请稍后再试"
	default:
		return "操作未完成，请稍后重试"
	}
}
