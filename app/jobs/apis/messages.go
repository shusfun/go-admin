package apis

func userFacingApiErrorMessage(code int) string {
	switch code {
	case 400, 422:
		return "提交的信息有误，请检查后重试"
	default:
		return "操作未完成，请稍后重试"
	}
}
