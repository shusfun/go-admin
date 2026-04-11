package apis

import (
	"go-admin/app/admin/models"
	"go-admin/common/images"
)

type SysUserProfileUserResponse struct {
	UserID   int           `json:"userId"`
	Username string        `json:"username"`
	NickName string        `json:"nickName"`
	DeptID   int           `json:"deptId"`
	RoleID   int           `json:"roleId"`
	Phone    string        `json:"phone"`
	Email    string        `json:"email"`
	Avatar   *images.Asset `json:"avatar"`
	Remark   string        `json:"remark"`
}

type SysUserProfileResponse struct {
	User  SysUserProfileUserResponse `json:"user"`
	Roles []models.SysRole           `json:"roles"`
	Posts []models.SysPost           `json:"posts"`
}

type SysUserInfoResponse struct {
	Roles        []string      `json:"roles"`
	Permissions  []string      `json:"permissions"`
	Buttons      []string      `json:"buttons"`
	Introduction string        `json:"introduction"`
	Avatar       *images.Asset `json:"avatar"`
	UserName     string        `json:"userName"`
	UserID       int           `json:"userId"`
	DeptID       int           `json:"deptId"`
	Name         string        `json:"name"`
	Code         int           `json:"code"`
}
