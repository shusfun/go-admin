import { Image, SurfaceCard } from "@go-admin/ui-mobile";
import type { InfoResponse, ProfileResponse } from "@go-admin/types";

export function ProfilePage({ info, profile }: { info: InfoResponse; profile: ProfileResponse }) {
  const displayName = info.name || profile.user.nickName || info.userName;
  const avatar = profile.user.avatar ?? info.avatar;

  return (
    <div className="mobile-stack">
      <SurfaceCard description="账户与身份概览" title="个人资料">
        <div className="mobile-profile-summary">
          <div aria-label={`${displayName} 的头像`} className="mobile-profile-avatar">
            {avatar ? (
              <Image alt={displayName} className="mobile-profile-avatar__image" src={avatar} />
            ) : (
              <span className="mobile-profile-avatar__fallback">{displayName.slice(0, 1)}</span>
            )}
          </div>
          <div className="mobile-profile-summary__copy">
            <strong>{displayName}</strong>
            <span>@{info.userName}</span>
            <span>{info.roles.join(" / ") || "未配置角色"}</span>
          </div>
        </div>
        <dl className="mobile-detail-grid">
          <dt>用户名</dt>
          <dd>{info.userName}</dd>
          <dt>昵称</dt>
          <dd>{info.name || profile.user.nickName}</dd>
          <dt>手机号</dt>
          <dd>{profile.user.phone || "未设置"}</dd>
          <dt>邮箱</dt>
          <dd>{profile.user.email || "未设置"}</dd>
        </dl>
      </SurfaceCard>
      <SurfaceCard description="角色与岗位信息" title="角色与岗位">
        <dl className="mobile-detail-grid">
          <dt>角色</dt>
          <dd>{info.roles.join(" / ")}</dd>
          <dt>岗位</dt>
          <dd>{profile.posts.map((item) => item.postName).join(" / ") || "未配置"}</dd>
          <dt>权限数</dt>
          <dd>{info.permissions.length}</dd>
          <dt>说明</dt>
          <dd>{info.introduction}</dd>
        </dl>
      </SurfaceCard>
    </div>
  );
}
