import { ActionTile, Image, MobileHero } from "@go-admin/ui-mobile";
import type { InfoResponse, ProfileResponse } from "@go-admin/types";

export function HomePage({
  info,
  profile,
  tenantCode,
}: {
  info: InfoResponse;
  profile: ProfileResponse;
  tenantCode: string;
}) {
  const displayName = info.name || profile.user.nickName || info.userName;
  const avatar = profile.user.avatar ?? info.avatar;

  return (
    <div className="mobile-stack">
      <MobileHero
        description={`租户：${tenantCode}`}
        eyebrow="移动首页"
        media={
          <div aria-label={`${displayName} 的头像`} className="mobile-home-avatar">
            {avatar ? (
              <Image alt={displayName} className="mobile-home-avatar__image" src={avatar} />
            ) : (
              <span className="mobile-home-avatar__fallback">{displayName.slice(0, 1)}</span>
            )}
          </div>
        }
        title={`你好，${info.name || info.userName}`}
      />

      <div className="mobile-grid">
        <ActionTile detail={`${profile.roles.length} 个角色`} title="角色" />
        <ActionTile detail={`${profile.posts.length} 个岗位`} title="岗位" />
        <ActionTile detail={`${info.permissions.length} 个权限`} title="权限" />
      </div>
    </div>
  );
}
