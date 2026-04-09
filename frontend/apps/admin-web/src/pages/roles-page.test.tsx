// @vitest-environment jsdom
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RolesPage } from "./roles-page";

let host: HTMLDivElement;
let root: Root;

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(label));
}

async function flushPromises(rounds = 5) {
  for (let index = 0; index < rounds; index += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function waitForCondition(assertion: () => void, timeoutMs = 2000) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  throw lastError instanceof Error ? lastError : new Error("等待断言超时");
}

async function clickButton(label: string) {
  const button = findButton(label);
  expect(button).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function createApi() {
  const role = {
    roleId: 9,
    roleName: "运营角色",
    roleKey: "ops",
    roleSort: 3,
    status: "2",
    flag: "",
    remark: "负责运营模块",
    admin: false,
    dataScope: "2",
  };

  return {
    admin: {
      createRole: vi.fn(),
      deleteRoles: vi.fn(),
      getRole: vi.fn().mockResolvedValue(role),
      getRoleDeptTree: vi.fn().mockResolvedValue({
        checkedKeys: [11],
        depts: [
          { id: 11, label: "研发部" },
          { id: 12, label: "运维部" },
        ],
      }),
      getRoleMenuTree: vi.fn().mockResolvedValue({
        checkedKeys: [1],
        menus: [
          {
            id: 1,
            label: "系统管理",
            children: [{ id: 2, label: "用户管理" }],
          },
        ],
      }),
      listRoles: vi.fn().mockResolvedValue({
        count: 1,
        list: [role],
      }),
      updateRole: vi.fn(),
      updateRoleDataScope: vi.fn(),
      updateRoleStatus: vi.fn().mockResolvedValue(undefined),
    },
  };
}

async function renderPage(api: ReturnType<typeof createApi>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <RolesPage api={api as never} />
      </QueryClientProvider>,
    );
  });

  await flushPromises();
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

describe("RolesPage", () => {
  it("编辑角色时加载菜单树和部门树，并在自定数据权限下允许部门选择", async () => {
    const api = createApi();

    await renderPage(api);

    await waitForCondition(() => {
      expect(api.admin.listRoles).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain("运营角色");
    });

    await clickButton("编辑");
    await flushPromises(8);

    expect(api.admin.getRole).toHaveBeenCalledWith(9);
    expect(api.admin.getRoleMenuTree).toHaveBeenCalledWith(9);
    expect(api.admin.getRoleDeptTree).toHaveBeenCalledWith(9);
    expect(document.body.textContent).toContain("编辑角色");

    const selectAllButtons = Array.from(document.querySelectorAll("button")).filter((item) => item.textContent?.includes("全选"));
    expect(selectAllButtons).toHaveLength(2);
    expect((selectAllButtons[1] as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      selectAllButtons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushPromises();

    expect(document.body.textContent).toContain("当前选中 2 项");
  });

  it("状态切换通过统一确认弹层提交", async () => {
    const api = createApi();

    await renderPage(api);
    await waitForCondition(() => {
      expect(findButton("停用")).toBeTruthy();
    });

    await clickButton("停用");
    await waitForCondition(() => {
      expect(document.body.textContent).toContain("确认停用该角色");
    });

    await clickButton("确认");
    await flushPromises(6);

    expect(api.admin.updateRoleStatus).toHaveBeenCalledWith(9, "1");
  });
});
