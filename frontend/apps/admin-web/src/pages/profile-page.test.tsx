// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfilePage } from "./profile-page";

let host: HTMLDivElement;
let root: Root;

async function flushPromises(rounds = 5) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
});

describe("ProfilePage", () => {
  it("上传头像后会调用上传接口并刷新查询", async () => {
    const api = {
      system: {
        uploadAvatar: vi.fn().mockResolvedValue({
          path: "/static/uploadfile/avatar/avatar-next.webp",
          size: 512,
          variants: [
            { path: "/static/uploadfile/avatar/avatar-next@64.webp", size: 64 },
            { path: "/static/uploadfile/avatar/avatar-next@128.webp", size: 128 },
            { path: "/static/uploadfile/avatar/avatar-next@256.webp", size: 256 },
          ],
        }),
      },
    };
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProfilePage
            api={api}
            info={{
              avatar: {
                path: "/static/uploadfile/avatar/avatar-old.webp",
                size: 512,
                variants: [
                  { path: "/static/uploadfile/avatar/avatar-old@64.webp", size: 64 },
                  { path: "/static/uploadfile/avatar/avatar-old@128.webp", size: 128 },
                  { path: "/static/uploadfile/avatar/avatar-old@256.webp", size: 256 },
                ],
              },
              buttons: [],
              code: 200,
              deptId: 1,
              introduction: "",
              name: "管理员",
              permissions: [],
              roles: ["系统管理员"],
              userId: 1,
              userName: "admin",
            }}
            profile={{
              posts: [],
              roles: [],
              user: {
                avatar: {
                  path: "/static/uploadfile/avatar/avatar-old.webp",
                  size: 512,
                  variants: [
                    { path: "/static/uploadfile/avatar/avatar-old@64.webp", size: 64 },
                    { path: "/static/uploadfile/avatar/avatar-old@128.webp", size: 128 },
                    { path: "/static/uploadfile/avatar/avatar-old@256.webp", size: 256 },
                  ],
                },
                deptId: 1,
                email: "",
                nickName: "管理员",
                phone: "",
                remark: "",
                roleId: 1,
                userId: 1,
                username: "admin",
              },
            }}
          />
        </QueryClientProvider>,
      );
    });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await act(async () => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushPromises(8);

    expect(api.system.uploadAvatar).toHaveBeenCalledWith(file);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin", "info"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["admin", "profile"] });
  });
});
