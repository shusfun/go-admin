// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ConfirmDialog,
  DetailSplitTablePattern,
  FormDialog,
  GroupedMetricTablePattern,
  LogViewer,
  ThemeToggle,
  TreeSelectorPanel,
  WideTablePatternGallery,
  WorkbenchWideTablePattern,
} from "./index";

const setTheme = vi.fn();

vi.mock("@go-admin/design-tokens", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme,
  }),
}));

let host: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function findButton(label: string) {
  return Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(label));
}

beforeEach(() => {
  // React 19 test environment hint
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  setTheme.mockReset();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === "string" && message.includes("Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.")) {
      return;
    }
    originalConsoleError(message, ...args);
  });
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation((message?: unknown, ...args: unknown[]) => {
    if (typeof message === "string" && message.includes("Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.")) {
      return;
    }
    originalConsoleWarn(message, ...args);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  document.body.innerHTML = "";
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});

describe("ui-admin components", () => {
  it("ConfirmDialog 点击确认后触发回调并关闭", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const setOpen = vi.fn();

    await act(async () => {
      root.render(
        <ConfirmDialog
          description="删除后无法恢复"
          onConfirm={onConfirm}
          open
          setOpen={setOpen}
          title="确认删除？"
        />,
      );
    });

    const confirmButton = findButton("确认");
    expect(confirmButton).toBeTruthy();

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("ConfirmDialog 点击取消时关闭弹层且不触发确认", async () => {
    const onConfirm = vi.fn();
    const setOpen = vi.fn();

    await act(async () => {
      root.render(
        <ConfirmDialog
          description="取消后保持当前数据"
          onConfirm={onConfirm}
          open
          setOpen={setOpen}
          title="确认关闭？"
        />,
      );
    });

    const cancelButton = findButton("取消");
    expect(cancelButton).toBeTruthy();

    await act(async () => {
      cancelButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("FormDialog 在打开时渲染标题和内容", async () => {
    const onOpenChange = vi.fn();

    await act(async () => {
      root.render(
        <FormDialog onOpenChange={onOpenChange} open title="编辑表单">
          <div>表单内容</div>
        </FormDialog>,
      );
    });

    expect(document.body.textContent).toContain("编辑表单");
    expect(document.body.textContent).toContain("表单内容");

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("TreeSelectorPanel 点击全选时返回完整节点集合", async () => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <TreeSelectorPanel
          checkedIds={[]}
          nodes={[
            {
              id: 1,
              label: "系统管理",
              children: [
                { id: 2, label: "用户管理" },
                { id: 3, label: "角色管理" },
              ],
            },
          ]}
          onChange={onChange}
          title="菜单权限"
        />,
      );
    });

    const selectAllButton = findButton("全选");
    expect(selectAllButton).toBeTruthy();

    await act(async () => {
      selectAllButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onChange).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("LogViewer 在无日志时展示空态，有日志时展示内容", async () => {
    await act(async () => {
      root.render(<LogViewer title="实时日志" />);
    });

    expect(document.body.textContent).toContain("暂无日志");

    await act(async () => {
      root.render(<LogViewer log={"line-1\nline-2"} title="实时日志" />);
    });

    expect(document.body.textContent).toContain("line-1");
    expect(document.body.textContent).toContain("line-2");
  });

  it("ThemeToggle 点击按钮时轮换主题", async () => {
    await act(async () => {
      root.render(<ThemeToggle />);
    });

    const trigger = Array.from(document.querySelectorAll("button")).find((item) => item.querySelector("svg"));
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("宽表方案组件集渲染三种方案标题", async () => {
    await act(async () => {
      root.render(<WideTablePatternGallery />);
    });

    expect(document.body.textContent).toContain("方案 A · 工作台宽表");
    expect(document.body.textContent).toContain("方案 B · 列表 + 详情栏");
    expect(document.body.textContent).toContain("方案 C · 分组宽表");
  });

  it("列表加详情方案在点击记录后更新详情内容", async () => {
    await act(async () => {
      root.render(<DetailSplitTablePattern />);
    });

    const trigger = document.querySelector('[data-record-id="log-3"]');
    expect(trigger).toBeTruthy();

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("返利条款审批卡点");
    expect(document.body.textContent).toContain("法务复核");
  });

  it("其余两种宽表方案可以独立渲染", async () => {
    await act(async () => {
      root.render(
        <>
          <WorkbenchWideTablePattern />
          <GroupedMetricTablePattern />
        </>,
      );
    });

    expect(document.body.textContent).toContain("默认视图");
    expect(document.body.textContent).toContain("按区域分组");
  });
});
