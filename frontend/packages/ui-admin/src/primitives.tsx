import { DayPicker, type DateRange } from "react-day-picker";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  LoaderCircle,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { toast, Toaster } from "sonner";
import {
  forwardRef,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type ThHTMLAttributes,
  type TdHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "./lib/utils";

export { toast };
export type { DateRange };

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-10 px-4 py-2",
        icon: "h-10 w-10",
        lg: "h-11 px-5 py-2.5",
        sm: "h-9 px-3",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "h-auto rounded-none px-0 text-primary underline-offset-4 hover:underline",
        outline: "border border-border bg-background hover:bg-secondary hover:text-secondary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
    },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ className, size, variant }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export function AsyncActionButton({
  children,
  loading,
  loadingLabel = "处理中...",
  ...props
}: ButtonProps & {
  loading?: boolean;
  loadingLabel?: ReactNode;
}) {
  return (
    <Button disabled={props.disabled || loading} {...props}>
      {loading ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: HTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

export function HelpText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function FieldError({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export function FormField({
  children,
  className,
  description,
  error,
  label,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label>{label}</Label>
      {children}
      {description ? <HelpText>{description}</HelpText> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-3xl border border-border bg-card text-card-foreground shadow-[var(--shadow-card)]", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2 border-b border-border/70 px-6 py-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold tracking-tight text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 border-t border-border/70 px-6 py-4", className)} {...props} />;
}

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "muted" | "success" | "warning" | "danger" }) {
  const tones: Record<string, string> = {
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    default: "border-primary/20 bg-primary/10 text-primary",
    muted: "border-border bg-secondary text-secondary-foreground",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-secondary", className)} {...props} />;
}

export function Loading({ className, label = "正在加载" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  action,
  className,
  description,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-3xl border border-dashed border-border bg-secondary/40 px-6 py-8", className)}>
      <div className="rounded-2xl bg-background p-3 text-muted-foreground shadow-sm">
        <TriangleAlert className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border transition-colors hover:bg-secondary/50", className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-11 px-4 text-left align-middle font-medium text-muted-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-foreground", className)} {...props} />;
}

export function Pagination({
  onNext,
  onPrevious,
  page,
  totalPages,
}: {
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        第 {page} / {totalPages} 页
      </p>
      <div className="flex items-center gap-2">
        <Button disabled={page <= 1} onClick={onPrevious} size="sm" type="button" variant="outline">
          <ChevronLeft className="h-4 w-4" />
          上一页
        </Button>
        <Button disabled={page >= totalPages} onClick={onNext} size="sm" type="button" variant="outline">
          下一页
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    className={cn("peer h-4 w-4 shrink-0 rounded border border-primary shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className)}
    ref={ref}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn("peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export function RadioGroup(props: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className="grid gap-3" {...props} />;
}

export const RadioGroupItem = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    className={cn("aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)}
    ref={ref}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-2.5 w-2.5 fill-current text-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

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
>(({ children, className, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      className={cn("fixed left-[50%] top-[50%] z-50 grid w-[min(94vw,48rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[1.5rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] duration-200", className)}
      ref={ref}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">关闭</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export function Drawer({
  children,
  className,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay className="md:hidden" />
        <DialogPrimitive.Content className={cn("fixed inset-y-0 right-0 z-50 w-[min(88vw,22rem)] border-l border-border bg-card p-5 shadow-[var(--shadow-soft)] md:hidden", className)}>
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverContent = forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      className={cn("z-50 w-72 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-[var(--shadow-soft)] outline-none", className)}
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
export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      className={cn("z-50 min-w-[12rem] overflow-hidden rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-soft)]", className)}
      ref={ref}
      sideOffset={sideOffset}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
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

type SelectOption = {
  label: string;
  value: string | number;
};

const EMPTY_SELECT_VALUE = "__suiyuan_select_empty__";

export function Select({
  onValueChange,
  options,
  placeholder = "请选择",
  value,
}: {
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
}) {
  const normalizedValue = value === "" ? EMPTY_SELECT_VALUE : value;

  return (
    <SelectPrimitive.Root
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)}
      value={normalizedValue}
    >
      <SelectPrimitive.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm text-left ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[var(--shadow-soft)]">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className="relative flex cursor-default select-none items-center rounded-xl py-2 pl-8 pr-3 text-sm outline-none hover:bg-secondary focus:bg-secondary"
                key={String(option.value)}
                value={option.value === "" ? EMPTY_SELECT_VALUE : String(option.value)}
              >
                <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function Combobox({
  emptyLabel = "没有匹配项",
  onSelect,
  options,
  placeholder = "请选择",
  searchPlaceholder = "输入关键词筛选",
  value,
}: {
  emptyLabel?: string;
  onSelect: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  value?: string;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const selected = options.find((option) => String(option.value) === value);
  const filteredOptions = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [keyword, options]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="w-full justify-between" type="button" variant="outline">
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="grid gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => setKeyword(event.target.value)} placeholder={searchPlaceholder} value={keyword} />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length ? (
              <div className="grid gap-1">
                {filteredOptions.map((option) => (
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary",
                      String(option.value) === value && "bg-secondary text-foreground",
                    )}
                    key={String(option.value)}
                    onClick={() => {
                      onSelect(String(option.value));
                      setOpen(false);
                      setKeyword("");
                    }}
                    type="button"
                  >
                    <span>{option.label}</span>
                    {String(option.value) === value ? <Check className="h-4 w-4" /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">{emptyLabel}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Breadcrumb({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
            {item.href ? (
              <a className="transition-colors hover:text-foreground" href={item.href}>
                {item.label}
              </a>
            ) : (
              <span className={index === items.length - 1 ? "font-medium text-foreground" : ""}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
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
  description: ReactNode;
  onConfirm: () => void | Promise<void>;
  open: boolean;
  setOpen: (open: boolean) => void;
  title: ReactNode;
}) {
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
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

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-3", className)}>{children}</div>;
}

export function DetailItem({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-border/70 bg-secondary/30 p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function DefinitionList({
  children,
  className,
  columns = 1,
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  const columnsClass =
    columns === 3
      ? "md:grid-cols-2 xl:grid-cols-3"
      : columns === 2
        ? "md:grid-cols-2"
        : "grid-cols-1";

  return <dl className={cn("grid gap-4", columnsClass, className)}>{children}</dl>;
}

export function DetailGrid({
  items,
  className,
  columns = 2,
}: {
  items: Array<{ label: ReactNode; value: ReactNode }>;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <DefinitionList className={className} columns={columns}>
      {items.map((item, index) => (
        <DetailItem key={`${String(item.label)}-${index}`} label={item.label} value={item.value} />
      ))}
    </DefinitionList>
  );
}

export function KeyValueCard({
  className,
  description,
  items,
  title,
}: {
  className?: string;
  description?: ReactNode;
  items: Array<{ label: ReactNode; value: ReactNode }>;
  title: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <DetailGrid items={items} />
      </CardContent>
    </Card>
  );
}

export function ReadonlyCodeBlock({
  children,
  className,
  emptyLabel = "暂无内容",
  title,
}: {
  children?: ReactNode;
  className?: string;
  emptyLabel?: ReactNode;
  title?: ReactNode;
}) {
  const content = typeof children === "string" ? children.trim() : children;

  return (
    <div className={cn("grid gap-3 rounded-3xl border border-border bg-slate-950 px-5 py-4 text-slate-100", className)}>
      {title ? <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</div> : null}
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs leading-6">
        {content || emptyLabel}
      </pre>
    </div>
  );
}

export function InlineNotice({
  actions,
  children,
  className,
  tone = "info",
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "info" | "success" | "warning" | "danger";
  title?: ReactNode;
}) {
  const toneClass: Record<string, string> = {
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    info: "border-primary/20 bg-primary/10 text-primary",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };

  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3", toneClass[tone], className)}>
      <div className="min-w-0 space-y-1">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <div className="text-sm leading-6">{children}</div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function FormSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cn("grid gap-4 rounded-3xl border border-border/70 bg-secondary/20 p-5", className)}>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
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

export function EmptyLogState({
  action,
  className,
  description = "当前没有日志输出，可稍后重试或等待任务继续推进。",
  title = "暂无日志",
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}) {
  return <EmptyState action={action} className={className} description={description} title={title} />;
}

export function DatePicker({
  onChange,
  placeholder = "选择日期",
  value,
}: {
  onChange: (value?: Date) => void;
  placeholder?: string;
  value?: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="w-full justify-between" type="button" variant="outline">
          <span>{value ? value.toLocaleDateString("zh-CN") : placeholder}</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker
          mode="single"
          onSelect={(next) => {
            onChange(next);
            setOpen(false);
          }}
          selected={value}
        />
      </PopoverContent>
    </Popover>
  );
}

export function DateRangePicker({
  onChange,
  value,
}: {
  onChange: (value?: DateRange) => void;
  value?: DateRange;
}) {
  const [open, setOpen] = useState(false);
  const label = value?.from
    ? `${value.from.toLocaleDateString("zh-CN")} - ${value.to?.toLocaleDateString("zh-CN") || "未结束"}`
    : "选择时间范围";

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className="w-full justify-between" type="button" variant="outline">
          <span className="truncate">{label}</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker mode="range" onSelect={onChange} selected={value} />
      </PopoverContent>
    </Popover>
  );
}
