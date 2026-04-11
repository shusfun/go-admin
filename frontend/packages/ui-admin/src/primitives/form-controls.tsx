import { DayPicker, type DateRange as CalendarDateRange, type Matcher } from "react-day-picker";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, ChevronsUpDown, ChevronDown, Circle, Eye, EyeOff, Search, UploadCloud, X } from "lucide-react";
import {
  type ChangeEvent,
  forwardRef,
  type ForwardedRef,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./overlays";
import { AppScrollbar } from "./scroll-area";
import { cn } from "../lib/utils";
import { controlSizeClasses, getControlStateClass, type ControlSize, type ControlStatus, type SelectOption } from "./shared";

export type { CalendarDateRange as DateRange };
export {
  DatePicker,
  DateRangePicker,
  type DatePickerModelValue,
  type DatePickerPanelChangeEvent,
  type DatePickerProps,
  type DatePickerRef,
  type DateRangePickerProps,
  type DateRangePickerValue,
  type DateShortcut,
} from "./date-picker";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  append?: ReactNode;
  clearable?: boolean;
  completePlaceholderOnTab?: boolean;
  error?: boolean;
  onClear?: () => void;
  passwordToggle?: boolean;
  prefix?: ReactNode;
  prepend?: ReactNode;
  size?: Exclude<ControlSize, "icon">;
  status?: ControlStatus;
  suffix?: ReactNode;
}

function assignInnerRef<T>(ref: ForwardedRef<T>, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function applyControlValue(element: HTMLInputElement | HTMLTextAreaElement, nextValue: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(element, nextValue);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

function resolvePlaceholderCompletion(currentValue: string, placeholder: string, maxLength?: number) {
  const suggestion = typeof maxLength === "number" ? placeholder.slice(0, maxLength) : placeholder;

  if (!suggestion || suggestion === currentValue) {
    return null;
  }

  if (currentValue.length > suggestion.length) {
    return null;
  }

  if (currentValue.length > 0 && !suggestion.startsWith(currentValue)) {
    return null;
  }

  return suggestion;
}

function resolvePasswordToggleLabel(passwordVisible: boolean) {
  if (typeof document !== "undefined" && document.documentElement.lang.toLowerCase().startsWith("en")) {
    return passwordVisible ? "Hide password" : "Show password";
  }
  return passwordVisible ? "隐藏密码" : "显示密码";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    append,
    className,
    clearable = false,
    completePlaceholderOnTab = false,
    error = false,
    onClear,
    onChange,
    onKeyDown,
    placeholder,
    passwordToggle,
    prefix,
    prepend,
    size = "default",
    status,
    suffix,
    type,
    value,
    ...props
  },
  ref,
) {
  const resolvedStatus = error ? "error" : (status ?? "default");
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordToggleEnabled = type === "password" && passwordToggle !== false;
  const resolvedType = passwordToggleEnabled && passwordVisible ? "text" : (type ?? "text");

  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-xl border bg-background transition-all focus-within:ring-4",
        controlSizeClasses[size],
        getControlStateClass(resolvedStatus),
        className,
      )}
    >
      {prepend ? <span className="inline-flex items-center border-r border-border/70 bg-secondary/55 px-3 text-sm text-muted-foreground">{prepend}</span> : null}
      {prefix ? <span className="inline-flex items-center pl-3 text-muted-foreground">{prefix}</span> : null}
      <input
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          prefix ? "pl-2" : "",
          suffix || clearable || append || passwordToggleEnabled ? "pr-2" : "",
        )}
        onChange={onChange}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (
            event.defaultPrevented ||
            event.key !== "Tab" ||
            event.shiftKey ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            !completePlaceholderOnTab ||
            typeof placeholder !== "string" ||
            props.disabled ||
            props.readOnly
          ) {
            return;
          }

          const currentValue = event.currentTarget.value;
          const nextValue = resolvePlaceholderCompletion(currentValue, placeholder, props.maxLength);

          if (!nextValue) {
            return;
          }

          const selectionStart = event.currentTarget.selectionStart ?? currentValue.length;
          const selectionEnd = event.currentTarget.selectionEnd ?? currentValue.length;
          if (selectionStart !== currentValue.length || selectionEnd !== currentValue.length) {
            return;
          }

          event.preventDefault();
          applyControlValue(event.currentTarget, nextValue);
        }}
        placeholder={placeholder}
        ref={(node) => assignInnerRef(ref, node)}
        type={resolvedType}
        value={value}
        {...props}
      />
      {clearable && hasValue && !props.disabled ? (
        <button
          className="inline-flex items-center px-2 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            onClear?.();
            onChange?.({
              currentTarget: { value: "" } as HTMLInputElement,
              target: { value: "" } as HTMLInputElement,
            } as ChangeEvent<HTMLInputElement>);
          }}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {passwordToggleEnabled ? (
        <button
          aria-label={resolvePasswordToggleLabel(passwordVisible)}
          aria-pressed={passwordVisible}
          className="inline-flex items-center px-2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={props.disabled}
          onClick={() => setPasswordVisible((current) => !current)}
          type="button"
        >
          {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      ) : null}
      {suffix ? <span className="inline-flex items-center px-3 text-muted-foreground">{suffix}</span> : null}
      {append ? <span className="inline-flex items-center border-l border-border/70 bg-secondary/55 px-3 text-sm text-muted-foreground">{append}</span> : null}
    </div>
  );
});
Input.displayName = "Input";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  completePlaceholderOnTab?: boolean;
  error?: boolean;
  showCount?: boolean;
  size?: Exclude<ControlSize, "icon">;
  status?: ControlStatus;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, completePlaceholderOnTab = false, error = false, maxLength, onKeyDown, placeholder, showCount = false, size = "default", status, value, ...props },
  ref,
) {
  const resolvedStatus = error ? "error" : (status ?? "default");
  const count = typeof value === "string" ? value.length : 0;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border bg-background px-3 py-3 transition-all focus-within:ring-4",
        getControlStateClass(resolvedStatus),
        className,
      )}
    >
      <textarea
        className={cn(
          "min-h-[120px] w-full resize-y bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          size === "large" || size === "lg" ? "text-base" : size === "small" || size === "sm" ? "text-xs" : "text-sm",
        )}
        maxLength={maxLength}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (
            event.defaultPrevented ||
            event.key !== "Tab" ||
            event.shiftKey ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            !completePlaceholderOnTab ||
            typeof placeholder !== "string" ||
            props.disabled ||
            props.readOnly
          ) {
            return;
          }

          const currentValue = event.currentTarget.value;
          const nextValue = resolvePlaceholderCompletion(currentValue, placeholder, maxLength);

          if (!nextValue) {
            return;
          }

          const selectionStart = event.currentTarget.selectionStart ?? currentValue.length;
          const selectionEnd = event.currentTarget.selectionEnd ?? currentValue.length;
          if (selectionStart !== currentValue.length || selectionEnd !== currentValue.length) {
            return;
          }

          event.preventDefault();
          applyControlValue(event.currentTarget, nextValue);
        }}
        placeholder={placeholder}
        ref={ref}
        value={value}
        {...props}
      />
      {showCount ? (
        <div className="flex justify-end text-xs text-muted-foreground">
          {count}
          {typeof maxLength === "number" ? ` / ${maxLength}` : ""}
        </div>
      ) : null}
    </div>
  );
});
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

export function Form({
  children,
  className,
  layout = "vertical",
  ...props
}: FormHTMLAttributes<HTMLFormElement> & { layout?: "inline" | "vertical" }) {
  return (
    <form className={cn(layout === "inline" ? "flex flex-wrap items-start gap-4" : "grid gap-5", className)} {...props}>
      {children}
    </form>
  );
}

export function FormField({
  children,
  className,
  description,
  error,
  label,
  required = false,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label className="flex items-center gap-1.5">
        <span>{label}</span>
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {description ? <HelpText>{description}</HelpText> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

export const Checkbox = forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { invalid?: boolean; size?: "default" | "large" | "small" }
>(({ className, invalid = false, size = "default", ...props }, ref) => (
  <CheckboxPrimitive.Root
    className={cn(
      "peer shrink-0 rounded border shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      invalid ? "border-destructive focus-visible:ring-destructive/20" : "border-primary focus-visible:ring-ring",
      size === "large" ? "h-5 w-5" : size === "small" ? "h-3.5 w-3.5" : "h-4 w-4",
      className,
    )}
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
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & { loading?: boolean; size?: "default" | "large" | "small" }
>(({ className, loading = false, size = "default", ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex shrink-0 items-center rounded-full border border-transparent bg-input transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      size === "large" ? "h-7 w-12" : size === "small" ? "h-5 w-9" : "h-6 w-11",
      loading && "opacity-80",
      className,
    )}
    ref={ref}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-background shadow transition-transform data-[state=unchecked]:translate-x-0",
        size === "large"
          ? "h-6 w-6 data-[state=checked]:translate-x-5"
          : size === "small"
            ? "h-4 w-4 data-[state=checked]:translate-x-4"
            : "h-5 w-5 data-[state=checked]:translate-x-5",
      )}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;

export function RadioGroup({
  className,
  direction = "vertical",
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & { direction?: "horizontal" | "vertical" }) {
  return <RadioGroupPrimitive.Root className={cn(direction === "horizontal" ? "flex flex-wrap gap-4" : "grid gap-3", className)} {...props} />;
}

export const RadioGroupItem = forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & { invalid?: boolean; size?: "default" | "large" | "small" }
>(({ className, invalid = false, size = "default", ...props }, ref) => (
  <RadioGroupPrimitive.Item
    className={cn(
      "aspect-square rounded-full border text-primary shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      invalid ? "border-destructive focus-visible:ring-destructive/20" : "border-primary focus-visible:ring-ring",
      size === "large" ? "h-5 w-5" : size === "small" ? "h-3.5 w-3.5" : "h-4 w-4",
      className,
    )}
    ref={ref}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-2.5 w-2.5 fill-current text-current" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

const EMPTY_SELECT_VALUE = "__go_admin_select_empty__";

export function Select({
  clearable = false,
  disabled = false,
  onClear,
  onValueChange,
  options,
  placeholder = "请选择",
  size = "default",
  status = "default",
  value,
}: {
  clearable?: boolean;
  disabled?: boolean;
  onClear?: () => void;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: ControlSize;
  status?: ControlStatus;
  value?: string;
}) {
  const normalizedValue = value === "" ? EMPTY_SELECT_VALUE : value;
  const showClear = clearable && !disabled && Boolean(value);

  return (
    <div className="relative">
      <SelectPrimitive.Root
        disabled={disabled}
        onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)}
        value={normalizedValue}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex w-full items-center justify-between rounded-xl border bg-background text-left text-foreground transition-all ring-offset-background focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
            controlSizeClasses[size],
            getControlStateClass(status),
            showClear ? "pr-16" : "pr-10",
            size === "large" || size === "lg" ? "px-4" : "px-3",
          )}
        >
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
      {showClear ? (
        <button
          className="absolute right-9 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={() => {
            if (onClear) {
              onClear();
              return;
            }
            onValueChange("");
          }}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function Combobox({
  clearable = false,
  disabled = false,
  emptyLabel = "没有匹配项",
  onClear,
  onSelect,
  options,
  placeholder = "请选择",
  searchPlaceholder = "输入关键词筛选",
  size = "default",
  status = "default",
  value,
}: {
  clearable?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  onClear?: () => void;
  onSelect: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  size?: ControlSize;
  status?: ControlStatus;
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
    <div className="relative">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-between rounded-xl border bg-background text-left text-foreground transition-all ring-offset-background focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
              controlSizeClasses[size],
              getControlStateClass(status),
              clearable && selected ? "pr-16" : "pr-10",
              size === "large" || size === "lg" ? "px-4" : "px-3",
            )}
            disabled={disabled}
            type="button"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label || placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
          <div className="grid gap-2">
            <Input onChange={(event) => setKeyword(event.target.value)} placeholder={searchPlaceholder} prefix={<Search className="h-4 w-4" />} value={keyword} />
            <AppScrollbar className="max-h-64">
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
            </AppScrollbar>
          </div>
        </PopoverContent>
      </Popover>
      {clearable && selected && !disabled ? (
        <button
          className="absolute right-9 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          onClick={() => {
            if (onClear) {
              onClear();
              return;
            }
            onSelect("");
          }}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

type CalendarBaseProps = {
  className?: string;
  disabled?: Matcher | Matcher[];
  numberOfMonths?: number;
  showOutsideDays?: boolean;
};

type CalendarSingleProps = CalendarBaseProps & {
  mode?: "single";
  onSelect?: (value?: Date) => void;
  selected?: Date;
};

type CalendarMultipleProps = CalendarBaseProps & {
  mode: "multiple";
  onSelect?: (value?: Date[]) => void;
  selected?: Date[];
};

type CalendarRangeProps = CalendarBaseProps & {
  mode: "range";
  onSelect?: (value?: CalendarDateRange) => void;
  selected?: CalendarDateRange;
};

export type CalendarProps = CalendarMultipleProps | CalendarRangeProps | CalendarSingleProps;

export function Calendar({
  className,
  disabled,
  mode = "single",
  numberOfMonths = 1,
  onSelect,
  selected,
  showOutsideDays = true,
}: CalendarProps) {
  if (mode === "multiple") {
    return (
      <div className={cn("inline-flex rounded-[1.5rem] border border-border bg-card p-3 shadow-sm", className)}>
        <DayPicker
          disabled={disabled}
          mode="multiple"
          numberOfMonths={numberOfMonths}
          onSelect={onSelect as CalendarMultipleProps["onSelect"]}
          selected={selected as CalendarMultipleProps["selected"]}
          showOutsideDays={showOutsideDays}
        />
      </div>
    );
  }

  if (mode === "range") {
    return (
      <div className={cn("inline-flex rounded-[1.5rem] border border-border bg-card p-3 shadow-sm", className)}>
        <DayPicker
          disabled={disabled}
          mode="range"
          numberOfMonths={numberOfMonths}
          onSelect={onSelect as CalendarRangeProps["onSelect"]}
          selected={selected as CalendarRangeProps["selected"]}
          showOutsideDays={showOutsideDays}
        />
      </div>
    );
  }

  return (
    <div className={cn("inline-flex rounded-[1.5rem] border border-border bg-card p-3 shadow-sm", className)}>
      <DayPicker
        disabled={disabled}
        mode="single"
        numberOfMonths={numberOfMonths}
        onSelect={onSelect as CalendarSingleProps["onSelect"]}
        selected={selected as CalendarSingleProps["selected"]}
        showOutsideDays={showOutsideDays}
      />
    </div>
  );
}

export type UploadFileItem = {
  file?: File;
  id: string;
  name: string;
  size: number;
  status?: "error" | "ready" | "success" | "uploading";
  url?: string;
};

export function Upload({
  accept,
  className,
  defaultFileList = [],
  disabled = false,
  drag = false,
  fileList,
  helperText,
  limit,
  listType = "text",
  multiple = false,
  onExceed,
  onFileListChange,
  placeholder = "点击上传，或将文件拖拽到此处",
  beforeUpload,
  triggerLabel = "选择文件",
}: {
  accept?: string;
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  className?: string;
  defaultFileList?: UploadFileItem[];
  disabled?: boolean;
  drag?: boolean;
  fileList?: UploadFileItem[];
  helperText?: ReactNode;
  limit?: number;
  listType?: "card" | "text";
  multiple?: boolean;
  onExceed?: (files: File[], currentFileList: UploadFileItem[]) => void;
  onFileListChange?: (nextFileList: UploadFileItem[]) => void;
  placeholder?: ReactNode;
  triggerLabel?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [internalFileList, setInternalFileList] = useState<UploadFileItem[]>(defaultFileList);
  const resolvedFileList = fileList ?? internalFileList;

  function updateFileList(nextFileList: UploadFileItem[]) {
    if (fileList === undefined) {
      setInternalFileList(nextFileList);
    }
    onFileListChange?.(nextFileList);
  }

  async function appendFiles(files: File[]) {
    if (disabled || files.length === 0) {
      return;
    }

    const remaining = typeof limit === "number" ? limit - resolvedFileList.length : files.length;
    if (typeof limit === "number" && remaining <= 0) {
      onExceed?.(files, resolvedFileList);
      return;
    }

    const nextFiles = typeof limit === "number" ? files.slice(0, remaining) : files;
    if (nextFiles.length < files.length) {
      onExceed?.(files, resolvedFileList);
    }

    const normalized: UploadFileItem[] = [];

    for (const file of nextFiles) {
      if (beforeUpload) {
        const allowed = await beforeUpload(file);
        if (!allowed) {
          continue;
        }
      }

      normalized.push({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: file.size,
        status: "ready",
      });
    }

    if (normalized.length === 0) {
      return;
    }

    updateFileList([...resolvedFileList, ...normalized]);
  }

  function formatFileSize(value: number) {
    if (value < 1024) {
      return `${value} B`;
    }
    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function removeFile(id: string) {
    updateFileList(resolvedFileList.filter((item) => item.id !== id));
  }

  return (
    <div className={cn("grid gap-3", className)}>
      <input
        accept={accept}
        className="sr-only"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          void appendFiles(files);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <button
        className={cn(
          "grid w-full gap-2 rounded-[1.5rem] border border-dashed border-border/80 bg-secondary/20 text-left transition-colors hover:border-primary/35 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50",
          drag ? "px-5 py-8" : "px-4 py-4",
        )}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          if (disabled || !drag) {
            return;
          }
          event.preventDefault();
        }}
        onDrop={(event) => {
          if (disabled || !drag) {
            return;
          }
          event.preventDefault();
          void appendFiles(Array.from(event.dataTransfer.files));
        }}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-background text-primary shadow-sm">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-semibold text-foreground">{placeholder}</div>
            <div className="text-xs leading-5 text-muted-foreground">
              {multiple ? "支持多文件上传" : "单文件上传"}
              {accept ? `，格式：${accept}` : ""}
              {typeof limit === "number" ? `，最多 ${limit} 个` : ""}
            </div>
          </div>
        </div>
        <div>
          <span className="inline-flex h-8 items-center rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm">
            {triggerLabel}
          </span>
        </div>
      </button>
      {helperText ? <HelpText>{helperText}</HelpText> : null}
      {resolvedFileList.length ? (
        listType === "card" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {resolvedFileList.map((item) => (
              <div className="grid gap-2 rounded-2xl border border-border/70 bg-card p-4" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{formatFileSize(item.size)}</div>
                  </div>
                  <Button onClick={() => removeFile(item.id)} size="small" type="button" variant="text">
                    删除
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">{item.status === "success" ? "已上传" : item.status === "error" ? "上传失败" : "待处理"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2 rounded-2xl border border-border/70 bg-card p-3">
            {resolvedFileList.map((item) => (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/25 px-3 py-2" key={item.id}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(item.size)}
                    {item.status ? ` · ${item.status}` : ""}
                  </div>
                </div>
                <Button onClick={() => removeFile(item.id)} size="small" type="button" variant="text">
                  删除
                </Button>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
