import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toUserFacingErrorMessage } from "@go-admin/api";
import { Avatar, AdminPageStack, AdminTwoColumn, DetailGrid, PageHeader, SectionCard, toast } from "@go-admin/ui-admin";
import type { ImageAsset, InfoResponse, ProfileResponse } from "@go-admin/types";
const AVATAR_MAX_SIZE = 25 * 1024 * 1024;

export function ProfilePage({
  api,
  info,
  profile,
}: {
  api: {
    system: {
      uploadAvatar: (file: File) => Promise<ImageAsset>;
    };
  };
  info: InfoResponse;
  profile: ProfileResponse;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<ImageAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const avatarSource = avatarOverride || profile.user.avatar || info.avatar;
  const displayName = info.name || profile.user.nickName || info.userName;

  function openPicker() {
    if (uploading) {
      return;
    }
    inputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("请选择 JPG、PNG、WebP 等图片文件");
      return;
    }

    if (file.size > AVATAR_MAX_SIZE) {
      toast.error("头像大小不能超过 25 MB");
      return;
    }

    setUploading(true);
    try {
      const nextSource = await api.system.uploadAvatar(file);
      setAvatarOverride(nextSource);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "info"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "profile"] }),
      ]);
      toast.success("头像已更新");
    } catch (error) {
      toast.error(toUserFacingErrorMessage(error, "头像上传失败"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminPageStack>
      <PageHeader description="查看和管理个人账号信息。" kicker="个人账号" title="个人中心" />

      <AdminTwoColumn>
        <SectionCard description="上传后会同步刷新侧栏与个人中心展示。" title="头像设置">
          <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
            <div className="justify-self-start">
              <button
                aria-label={uploading ? "头像上传中" : "更换头像"}
                className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
                disabled={uploading}
                onClick={openPicker}
                type="button"
              >
                <Avatar bordered name={displayName} size={96} src={avatarSource} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/10 text-white transition-all md:bg-slate-950/0 md:group-hover:bg-slate-950/58 md:group-focus-visible:bg-slate-950/58">
                  <span className="flex flex-col items-center gap-1 rounded-full border border-white/15 bg-slate-950/45 px-3 py-2 backdrop-blur-sm transition-all md:translate-y-1 md:border-white/0 md:bg-white/0 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:border-white/20 md:group-hover:bg-slate-950/24 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:border-white/20 md:group-focus-visible:bg-slate-950/24 md:group-focus-visible:opacity-100">
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.086a1.5 1.5 0 0 0 1.06-.44l.708-.706A1.5 1.5 0 0 1 10.414 4h3.172a1.5 1.5 0 0 1 1.06.44l.708.706a1.5 1.5 0 0 0 1.06.44H17.5A2.5 2.5 0 0 1 20 8.5v7A2.5 2.5 0 0 1 17.5 18h-11A2.5 2.5 0 0 1 4 15.5v-7Z"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                      />
                      <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                    <span className="text-[11px] font-semibold leading-none">{uploading ? "上传中" : "更换头像"}</span>
                  </span>
                </span>
              </button>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-1">
                <div className="text-base font-semibold text-foreground">{displayName}</div>
                <div className="text-sm text-muted-foreground">建议使用正方形 JPG / PNG / WebP 图片，大小不超过 25 MB。</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={handleFileChange} ref={inputRef} type="file" />
                <span className="text-xs text-muted-foreground">支持 JPG、PNG、WebP、GIF，图片大小不超过 25 MB。</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard description="基本账号与角色信息" title="账号信息">
          <DetailGrid
            items={[
              { label: "用户名", value: info.userName },
              { label: "显示名", value: info.name },
              { label: "部门 ID", value: info.deptId },
              { label: "角色", value: info.roles.join(" / ") },
            ]}
          />
        </SectionCard>
      </AdminTwoColumn>

      <SectionCard description="联系方式与岗位配置" title="联系与岗位">
        <DetailGrid
          items={[
            { label: "手机号", value: profile.user.phone || "未设置" },
            { label: "邮箱", value: profile.user.email || "未设置" },
            { label: "岗位", value: profile.posts.map((post) => post.postName).join(" / ") || "未配置" },
            { label: "备注", value: profile.user.remark || "暂无备注" },
          ]}
        />
      </SectionCard>
    </AdminPageStack>
  );
}
