import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { CornerDownLeft, Search, X } from "lucide-react";
import { toast, Toaster } from "sonner";
import { forwardRef, useEffect, useId, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";

import { Button, type ButtonProps } from "./button";
import { AppScrollbar } from "./scroll-area";
import { cn } from "../lib/utils";

export { toast };

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogPortal(props: DialogPrimitive.DialogPortalProps) {
  return <DialogPrimitive.Portal {...props} />;
}

export const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm", className)} ref={ref} {...props} />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, className, ...props }, ref) => {
  const describedBy = props["aria-describedby"];
  const { ["aria-describedby"]: _ignoredAriaDescribedBy, ...restProps } = props;
  const fallbackDescriptionId = useId();
  const descriptionId = describedBy ?? fallbackDescriptionId;

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        aria-describedby={descriptionId}
        className={cn("fixed left-[50%] top-[50%] z-50 grid w-[min(94vw,48rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[1.5rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] duration-200", className)}
        ref={ref}
        {...restProps}
      >
        {describedBy ? null : <DialogPrimitive.Description className="sr-only" id={fallbackDescriptionId} />}
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">关闭</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

export function Drawer({
  children,
  className,
  description,
  open,
  onOpenChange,
  title = "侧边抽屉",
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
}) {
  const descriptionId = useId();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={description ? descriptionId : undefined}
          className={cn("fixed inset-y-0 right-0 z-50 w-[min(88vw,22rem)] border-l border-border bg-card p-5 shadow-[var(--shadow-soft)]", className)}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {description ? <DialogDescription className="sr-only" id={descriptionId}>{description}</DialogDescription> : null}
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title className={cn("text-lg font-semibold text-foreground", className)} ref={ref} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description className={cn("text-sm leading-6 text-muted-foreground", className)} ref={ref} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ align = "start", className, collisionPadding = 12, sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      className={cn("z-50 w-72 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-soft)] outline-none", className)}
      collisionPadding={collisionPadding}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      className={cn("z-50 overflow-hidden rounded-xl bg-foreground px-3 py-1.5 text-xs text-background shadow-[var(--shadow-soft)]", className)}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> & {
  portalled?: boolean;
};
export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  DropdownMenuContentProps
>(({ className, portalled = true, sideOffset = 8, ...props }, ref) => {
  const content = (
    <DropdownMenuPrimitive.Content
      className={cn("z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-soft)]", className)}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  );

  if (!portalled) {
    return content;
  }

  return <DropdownMenuPrimitive.Portal>{content}</DropdownMenuPrimitive.Portal>;
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    className={cn("relative flex cursor-default select-none items-center rounded-xl px-3 py-2 text-sm outline-none transition-colors hover:bg-secondary focus:bg-secondary data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)}
    ref={ref}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

export const Tabs = TabsPrimitive.Root;
export const TabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    className={cn("inline-flex h-11 items-center justify-center rounded-2xl bg-secondary p-1 text-muted-foreground", className)}
    ref={ref}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)}
    ref={ref}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} ref={ref} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export type GlobalSearchItem = {
  description?: ReactNode;
  id: string;
  keywords?: string[];
  section?: ReactNode;
  title: ReactNode;
};

export function GlobalSearch({
  className,
  description = "按名称、分组或关键词快速筛选结果。",
  emptyLabel = "没有匹配结果",
  enableHotkeys = false,
  items,
  onOpenChange,
  onQueryChange,
  onSelect,
  open,
  placeholder = "搜索组件、页面或命令",
  query,
  title = "全局搜索",
}: {
  className?: string;
  description?: ReactNode;
  emptyLabel?: ReactNode;
  enableHotkeys?: boolean;
  items: GlobalSearchItem[];
  onOpenChange: (open: boolean) => void;
  onQueryChange?: (query: string) => void;
  onSelect?: (item: GlobalSearchItem) => void;
  open: boolean;
  placeholder?: string;
  query?: string;
  title?: ReactNode;
}) {
  const [internalQuery, setInternalQuery] = useState("");
  const resolvedQuery = query ?? internalQuery;
  const normalizedQuery = resolvedQuery.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const haystacks = [
        typeof item.title === "string" ? item.title : "",
        typeof item.section === "string" ? item.section : "",
        ...(item.keywords ?? []),
      ];

      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [items, normalizedQuery]);

  function setResolvedQuery(nextQuery: string) {
    if (query === undefined) {
      setInternalQuery(nextQuery);
    }
    onQueryChange?.(nextQuery);
  }

  useEffect(() => {
    if (!enableHotkeys || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableHotkeys, onOpenChange, open]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={cn("w-[min(92vw,42rem)] p-0", className)}>
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-4">
          <label className="flex items-center gap-3 rounded-2xl border border-input bg-background px-4 py-3 focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-ring/20">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onChange={(event) => setResolvedQuery(event.target.value)}
              placeholder={placeholder}
              value={resolvedQuery}
            />
            <span className="hidden items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground sm:inline-flex">
              <CornerDownLeft className="h-3 w-3" />
              回车执行
            </span>
          </label>
          <AppScrollbar className="max-h-[22rem]" viewportClassName="pr-1">
            <div className="grid gap-2">
              {filteredItems.length ? (
                filteredItems.map((item) => (
                  <button
                    className="grid gap-1 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                    key={item.id}
                    onClick={() => {
                      onSelect?.(item);
                      onOpenChange(false);
                    }}
                    type="button"
                  >
                    {item.section ? <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{item.section}</span> : null}
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    {item.description ? <span className="text-sm leading-6 text-muted-foreground">{item.description}</span> : null}
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/25 px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
              )}
            </div>
          </AppScrollbar>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  actionLabel = "确认",
  cancelLabel = "取消",
  description,
  onConfirm,
  open,
  setOpen,
  title,
}: {
  actionLabel?: string;
  cancelLabel?: string;
  description?: ReactNode;
  onConfirm: () => void | Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
  title: ReactNode;
}) {
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null && description !== "";

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent aria-describedby={hasDescription ? descriptionId : undefined} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {hasDescription ? <DialogDescription id={descriptionId}>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex justify-end gap-3">
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            {cancelLabel}
          </Button>
          <Button
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
            type="button"
            variant="destructive"
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmActionDialog({
  actionLabel = "确认",
  actionVariant = "destructive",
  cancelLabel = "取消",
  children,
  description,
  onConfirm,
  open,
  setOpen,
  title,
}: {
  actionLabel?: ReactNode;
  actionVariant?: NonNullable<ButtonProps["variant"]>;
  cancelLabel?: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  onConfirm: () => void | Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
  title: ReactNode;
}) {
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null && description !== "";

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent aria-describedby={hasDescription ? descriptionId : undefined} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {hasDescription ? <DialogDescription id={descriptionId}>{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <div className="grid gap-4">{children}</div> : null}
        <div className="flex justify-end gap-3">
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            {cancelLabel}
          </Button>
          <Button
            onClick={async () => {
              await onConfirm();
              setOpen(false);
            }}
            type="button"
            variant={actionVariant}
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ToastViewport() {
  return (
    <Toaster
      closeButton
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border border-border shadow-[var(--shadow-soft)]",
        },
      }}
    />
  );
}
