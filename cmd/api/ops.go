package api

import "go-admin/app/ops/router"

func init() {
	AppRouters = append(AppRouters, router.InitRouter)
}
