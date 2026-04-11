import {
  Button,
  Calendar,
  Checkbox,
  Combobox,
  DatePicker,
  type DatePickerModelValue,
  DateRange,
  DateRangePicker,
  type DateRangePickerValue,
  FieldError,
  Form,
  FormActions,
  FormField,
  HelpText,
  ImageCaptchaField,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  RowActions,
  Select,
  Switch,
  Textarea,
  Upload,
  toast,
  type UploadFileItem,
} from "@go-admin/ui-admin";
import { CalendarDays, Search } from "lucide-react";
import { useState } from "react";

import {
  ShowcaseDocPage,
  roleOptions,
  selectOptions,
  type ShowcaseCategory,
  type ShowcaseRoute,
} from "./shared";

const demoCaptchaSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96">
    <rect width="320" height="96" rx="20" fill="#eff6ff" />
    <path d="M28 66c26-30 58 24 84-8s55 6 86-12 49 26 88-6" fill="none" stroke="#93c5fd" stroke-width="6" stroke-linecap="round" />
    <text x="160" y="58" text-anchor="middle" font-size="34" font-weight="700" font-family="Arial, sans-serif" fill="#1d4ed8">AB12</text>
  </svg>
`);

function createDemoCaptcha() {
  return Promise.resolve({
    image: `data:image/svg+xml;charset=utf-8,${demoCaptchaSvg}`,
    uuid: `captcha-${Date.now()}`,
  });
}

function InputPage() {
  const [serviceName, setServiceName] = useState("ops-worker");

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"default"', description: "输入框尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: '"default"', description: "输入状态。", name: "status", type: '"default" | "error"' },
        { defaultValue: "false", description: "是否显示清空按钮。", name: "clearable", type: "boolean" },
        { defaultValue: "false", description: "是否允许在按下 Tab 时用 placeholder 文案补全输入。", name: "completePlaceholderOnTab", type: "boolean" },
        { defaultValue: `type === "password" 时默认开启`, description: "密码输入时是否显示明文切换按钮。", name: "passwordToggle", type: "boolean" },
        { defaultValue: '"text"', description: "原生输入类型，支持 `password`。", name: "type", type: 'InputHTMLAttributes<HTMLInputElement>["type"]' },
        { description: "受控值。", name: "value", type: "string" },
        { description: "输入回调。", name: "onChange", type: "(event: ChangeEvent<HTMLInputElement>) => void" },
        { description: "清空回调。", name: "onClear", type: "() => void" },
        { defaultValue: "false", description: "是否禁用。", name: "disabled", type: "boolean" },
        { description: "前置内容。", name: "prepend", type: "ReactNode" },
        { description: "后置内容。", name: "append", type: "ReactNode" },
        { description: "输入框内前后缀。", name: "prefix / suffix", type: "ReactNode" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<FormField label="服务名称">
  <Input
    value={serviceName}
    onChange={(event) => setServiceName(event.target.value)}
    clearable
    prefix={<Search className="h-4 w-4" />}
    append=".prod"
  />
</FormField>`,
          content: (
            <FormField description="带搜索前缀、可清空、带后置域名后缀。" label="基础组合">
              <Input
                append=".prod"
                clearable
                onChange={(event) => setServiceName(event.target.value)}
                onClear={() => setServiceName("")}
                placeholder="请输入服务名称"
                prefix={<Search className="h-4 w-4" />}
                value={serviceName}
              />
            </FormField>
          ),
          description: "输入框支持前后置内容、图标前缀和清空操作。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <Input size="large" prepend="https://" placeholder="大尺寸输入框" />
  <Input size="default" suffix={<CalendarDays className="h-4 w-4" />} />
  <Input size="small" append="ms" placeholder="输入超时时间" />
</RowActions>`,
          content: (
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Large">
                <Input placeholder="大尺寸输入框" prepend="https://" size="large" />
              </FormField>
              <FormField label="Default">
                <Input placeholder="默认尺寸" suffix={<CalendarDays className="h-4 w-4" />} />
              </FormField>
              <FormField label="Small">
                <Input append="ms" placeholder="输入超时时间" size="small" />
              </FormField>
            </div>
          ),
          description: "尺寸与前后缀组合示例。",
          title: "尺寸与前后缀",
        },
        {
          code: `<FormField label="管理后台密码">
  <Input defaultValue="admin123" type="password" />
</FormField>
<FormField label="关闭明文切换">
  <Input defaultValue="admin123" passwordToggle={false} type="password" />
</FormField>`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField description="`type=password` 时默认显示明文/密文切换按钮。" label="密码输入">
                <Input defaultValue="admin123" type="password" />
              </FormField>
              <FormField description="如业务不希望暴露切换能力，可显式关闭。" label="关闭切换">
                <Input defaultValue="admin123" passwordToggle={false} type="password" />
              </FormField>
            </div>
          ),
          description: "统一密码可见性切换，避免业务页各自重复实现。",
          title: "密码模式",
        },
        {
          code: `<Input completePlaceholderOnTab defaultValue="ops" placeholder="ops-worker-service" />
<Input status="error" value="" placeholder="请输入服务名称" />`,
          content: (
            <div className="grid gap-4">
              <FormField description="先输入前缀，再按 Tab 直接补全占位建议。" label="Tab 补全">
                <Input completePlaceholderOnTab defaultValue="ops" placeholder="ops-worker-service" />
              </FormField>
              <FormField error="服务名不能为空" label="错误态">
                <Input placeholder="请输入服务名称" status="error" value="" />
              </FormField>
              <FormField label="禁用态">
                <Input disabled placeholder="禁用输入框" value="readonly-service" />
              </FormField>
            </div>
          ),
          description: "状态覆盖 Tab 补全、错误态与禁用态。",
          title: "状态与补全",
        },
        {
          code: `<Form layout="inline" onSubmit={(event) => event.preventDefault()}>
  <FormField className="min-w-[220px] flex-1" label="服务名">
    <Input completePlaceholderOnTab placeholder="release-worker" prefix={<Search className="h-4 w-4" />} />
  </FormField>
  <FormField className="min-w-[220px] flex-1" label="超时(ms)">
    <Input append="ms" defaultValue="5000" size="small" />
  </FormField>
  <FormActions className="self-end">
    <Button type="submit">查询</Button>
  </FormActions>
</Form>`,
          content: (
            <Form className="rounded-2xl border border-border/70 bg-secondary/20 p-4" layout="inline" onSubmit={(event) => event.preventDefault()}>
              <FormField className="min-w-[220px] flex-1" label="服务名">
                <Input completePlaceholderOnTab placeholder="release-worker" prefix={<Search className="h-4 w-4" />} />
              </FormField>
              <FormField className="min-w-[220px] flex-1" label="超时(ms)">
                <Input append="ms" defaultValue="5000" size="small" />
              </FormField>
              <FormActions className="self-end">
                <Button type="submit">查询</Button>
              </FormActions>
            </Form>
          ),
          description: "输入组件在筛选表单中承接字段语义与密度控制。",
          title: "表单承接",
        },
      ]}
      description="Input 对齐后台单行录入场景，覆盖尺寸、前后缀、前后置内容、清空、密码可见性切换与错误态，并支持可选 Tab 补全。"
      notes={[
        "复杂校验文案由业务层决定，Input 只承接结构和状态表达。",
        "`type=password` 时默认提供明文切换；如需关闭可显式传入 `passwordToggle={false}`。",
        "Tab 补全默认关闭，只有明确传入开关时才会接管焦点键。",
        "长表单场景优先在 Form / FormField 中组合 Input，不在页面里直接散落输入框。",
      ]}
      title="Input"
    />
  );
}

function SelectPage() {
  const [selectedCluster, setSelectedCluster] = useState("shanghai");
  const [errorCluster, setErrorCluster] = useState("");

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "下拉选项列表。", name: "options", required: true, type: "Array<{ label: string; value: string | number }>" },
        { defaultValue: '"请选择"', description: "占位文案。", name: "placeholder", type: "string" },
        { description: "值变化回调。", name: "onValueChange", required: true, type: "(value: string) => void" },
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: '"default"', description: "状态。", name: "status", type: '"default" | "error"' },
        { defaultValue: "false", description: "是否允许清空。", name: "clearable", type: "boolean" },
        { description: "当前选中值。", name: "value", type: "string" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Select clearable onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />`,
          content: (
            <FormField label="基础选择">
              <Select clearable onValueChange={setSelectedCluster} options={selectOptions} value={selectedCluster} />
            </FormField>
          ),
          description: "固定枚举下拉的基础使用方式。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <Select size="large" options={selectOptions} onValueChange={() => undefined} />
  <Select size="small" options={selectOptions} onValueChange={() => undefined} />
</RowActions>`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Large">
                <Select onValueChange={() => undefined} options={selectOptions} placeholder="请选择机房" size="large" />
              </FormField>
              <FormField label="Small">
                <Select onValueChange={() => undefined} options={selectOptions} placeholder="请选择机房" size="small" />
              </FormField>
            </div>
          ),
          description: "尺寸组合覆盖紧凑与宽松输入密度。",
          title: "尺寸",
        },
        {
          code: `<Select status="error" value={errorCluster} onValueChange={setErrorCluster} options={selectOptions} clearable />
<Select disabled value="virginia" onValueChange={() => undefined} options={selectOptions} />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField error="请选择一个集群" label="错误态">
                <Select clearable onValueChange={setErrorCluster} options={selectOptions} status="error" value={errorCluster} />
              </FormField>
              <FormField label="禁用态">
                <Select disabled onValueChange={() => undefined} options={selectOptions} value="virginia" />
              </FormField>
            </div>
          ),
          description: "字段状态与禁用态示例。",
          title: "状态与禁用",
        },
      ]}
      description="Select 对齐固定枚举选择能力，统一尺寸、错误态、禁用态和清空态。"
      notes={["选项少且无需搜索时优先用 Select。", "错误态只表达字段有问题，错误文案放到 FormField。"]}
      title="Select"
    />
  );
}

function ComboboxPage() {
  const [selectedRole, setSelectedRole] = useState("tenant-admin");
  const [searchRole, setSearchRole] = useState("");

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "下拉选项列表。", name: "options", required: true, type: "Array<{ label: string; value: string | number }>" },
        { defaultValue: '"请选择"', description: "占位文案。", name: "placeholder", type: "string" },
        { defaultValue: '"输入关键词筛选"', description: "搜索框占位文案。", name: "searchPlaceholder", type: "string" },
        { defaultValue: "false", description: "是否允许清空。", name: "clearable", type: "boolean" },
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Combobox clearable onSelect={setSelectedRole} options={roleOptions} value={selectedRole} />`,
          content: (
            <FormField label="负责人角色">
              <Combobox clearable onSelect={setSelectedRole} options={roleOptions} value={selectedRole} />
            </FormField>
          ),
          description: "可搜索单选的基础场景。",
          title: "基础用法",
        },
        {
          code: `<Combobox clearable onSelect={setSearchRole} options={roleOptions} placeholder="搜索角色" value={searchRole} />
<Combobox options={roleOptions} placeholder="无匹配词可观察空态" />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="可搜索空值态">
                <Combobox clearable onSelect={setSearchRole} options={roleOptions} placeholder="搜索角色" value={searchRole} />
              </FormField>
              <FormField label="空结果提示">
                <Combobox onSelect={() => undefined} options={roleOptions} placeholder="输入不存在的关键词" searchPlaceholder="输入关键词筛选" />
              </FormField>
            </div>
          ),
          description: "演示搜索筛选与空结果状态。",
          title: "搜索与空态",
        },
        {
          code: `<Combobox size="small" onSelect={() => undefined} options={roleOptions} />
<Combobox disabled onSelect={() => undefined} options={roleOptions} value="auditor" />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Small">
                <Combobox onSelect={() => undefined} options={roleOptions} placeholder="小尺寸搜索" size="small" />
              </FormField>
              <FormField label="禁用态">
                <Combobox disabled onSelect={() => undefined} options={roleOptions} value="auditor" />
              </FormField>
            </div>
          ),
          description: "尺寸和禁用状态组合。",
          title: "尺寸与禁用",
        },
      ]}
      description="Combobox 对齐可搜索单选输入场景，适合角色、负责人、标签等枚举过滤。"
      notes={["远程搜索与分页应在业务层实现。", "没有搜索需求时建议使用 Select。"]}
      title="Combobox"
    />
  );
}

function DatePickerPage() {
  const [date, setDate] = useState<DatePickerModelValue>("2026-04-08");
  const [errorDate, setErrorDate] = useState<DatePickerModelValue>();

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "日期变化回调。", name: "onChange", required: true, type: "(value?: Date | string | number) => void" },
        { description: "当前日期值。", name: "value", type: "Date | string | number | undefined" },
        { defaultValue: '"YYYY-MM-DD"', description: "输入框展示格式。", name: "format", type: "string" },
        { description: "绑定值格式；设置后不再返回 Date。", name: "valueFormat", type: "string" },
        { defaultValue: "true", description: "是否可清空。", name: "clearable", type: "boolean" },
        { defaultValue: "true", description: "是否允许手输。", name: "editable", type: "boolean" },
        { defaultValue: "true", description: "是否展示确认区。", name: "showConfirm", type: "boolean" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<DatePicker onChange={setDate} value={date} valueFormat="YYYY-MM-DD" />`,
          content: (
            <FormField label="发布时间">
              <DatePicker onChange={setDate} value={date} valueFormat="YYYY-MM-DD" />
            </FormField>
          ),
          description: "单日期输入默认支持手输、弹层选择和确认提交。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <DatePicker size="large" valueFormat="YYYY-MM-DD" onChange={() => undefined} />
  <DatePicker size="small" valueFormat="YYYY-MM-DD" onChange={() => undefined} />
</RowActions>`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Large">
                <DatePicker onChange={() => undefined} size="large" valueFormat="YYYY-MM-DD" />
              </FormField>
              <FormField label="Small">
                <DatePicker onChange={() => undefined} size="small" valueFormat="YYYY-MM-DD" />
              </FormField>
            </div>
          ),
          description: "触发器与输入控件尺寸保持一致。",
          title: "尺寸",
        },
        {
          code: `<DatePicker status="error" onChange={setErrorDate} value={errorDate} valueFormat="YYYY-MM-DD" />
<DatePicker disabled onChange={() => undefined} value="2026-04-09" valueFormat="YYYY-MM-DD" />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField error="请选择发布日期" label="错误态">
                <DatePicker onChange={setErrorDate} status="error" value={errorDate} valueFormat="YYYY-MM-DD" />
              </FormField>
              <FormField label="禁用态">
                <DatePicker disabled onChange={() => undefined} value="2026-04-09" valueFormat="YYYY-MM-DD" />
              </FormField>
            </div>
          ),
          description: "字段错误和禁用态组合。",
          title: "状态与禁用",
        },
      ]}
      description="DatePicker 负责单日期选择，统一清空、尺寸、状态和禁用能力。"
      notes={["单日期场景优先使用 DatePicker。", "需要起止范围时切换到 DateRangePicker。"]}
      title="DatePicker"
    />
  );
}

function DateRangePickerPage() {
  const [range, setRange] = useState<DateRangePickerValue>(["2026-04-01 00:00:00", "2026-04-08 23:59:59"]);
  const [emptyRange, setEmptyRange] = useState<DateRangePickerValue>();

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "范围变化回调。", name: "onChange", required: true, type: "(value?: [Date | string | number, Date | string | number]) => void" },
        { description: "当前范围值。", name: "value", type: "[Date | string | number, Date | string | number] | undefined" },
        { defaultValue: '"YYYY-MM-DD"', description: "展示格式。", name: "format", type: "string" },
        { description: "绑定值格式。", name: "valueFormat", type: "string" },
        { defaultValue: "false", description: "是否拆开双面板导航。", name: "unlinkPanels", type: "boolean" },
        { description: "范围过程态回调。", name: "onCalendarChange", type: "(value?: [...]) => void" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<DateRangePicker
  defaultTime={[new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]}
  onChange={setRange}
  value={range}
  valueFormat="YYYY-MM-DD HH:mm:ss"
/>`,
          content: (
            <FormField label="观察窗口">
              <DateRangePicker
                defaultTime={[new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]}
                onChange={setRange}
                value={range}
                valueFormat="YYYY-MM-DD HH:mm:ss"
              />
            </FormField>
          ),
          description: "范围输入支持双输入框、双面板和闭区间字符串输出。",
          title: "基础用法",
        },
        {
          code: `<DateRangePicker size="large" onChange={() => undefined} valueFormat="YYYY-MM-DD" />
<DateRangePicker size="small" onChange={() => undefined} valueFormat="YYYY-MM-DD" />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Large">
                <DateRangePicker onChange={() => undefined} size="large" valueFormat="YYYY-MM-DD" />
              </FormField>
              <FormField label="Small">
                <DateRangePicker onChange={() => undefined} size="small" valueFormat="YYYY-MM-DD" />
              </FormField>
            </div>
          ),
          description: "范围选择器尺寸矩阵。",
          title: "尺寸",
        },
        {
          code: `<DateRangePicker status="error" onChange={setEmptyRange} value={emptyRange} valueFormat="YYYY-MM-DD" />
<DateRangePicker disabled onChange={() => undefined} value={["2026-04-01", "2026-04-08"]} valueFormat="YYYY-MM-DD" />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField error="请选择时间范围" label="错误态">
                <DateRangePicker onChange={setEmptyRange} status="error" value={emptyRange} valueFormat="YYYY-MM-DD" />
              </FormField>
              <FormField label="禁用态">
                <DateRangePicker
                  disabled
                  onChange={() => undefined}
                  value={["2026-04-01", "2026-04-08"]}
                  valueFormat="YYYY-MM-DD"
                />
              </FormField>
            </div>
          ),
          description: "字段状态和禁用态。",
          title: "状态与禁用",
        },
      ]}
      description="DateRangePicker 负责时间窗口选择，适合筛选区和统计页的范围输入。"
      notes={["筛选区统一使用这一组件，保持交互一致。", "快捷范围策略由业务层包装，不放入基础组件。"]}
      title="DateRangePicker"
    />
  );
}

function SwitchPage() {
  const [enabled, setEnabled] = useState(true);

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "false", description: "是否进入轻加载态。", name: "loading", type: "boolean" },
        { defaultValue: "false", description: "是否禁用。", name: "disabled", type: "boolean" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Switch checked={enabled} onCheckedChange={setEnabled} />`,
          content: (
            <label className="flex items-center justify-between gap-3 rounded-surface border border-border bg-background px-4 py-3">
              <span className="text-sm font-medium text-foreground">启用发布提醒</span>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </label>
          ),
          description: "用于即时生效的布尔配置。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <Switch checked={true} loading size="large" />
  <Switch checked={false} size="default" />
  <Switch checked={true} size="small" />
</RowActions>`,
          content: (
            <RowActions>
              <Switch checked={true} loading size="large" />
              <Switch checked={false} size="default" />
              <Switch checked={true} size="small" />
            </RowActions>
          ),
          description: "尺寸和 loading 态。",
          title: "尺寸与加载",
        },
        {
          code: `<Switch checked={true} disabled size="default" />`,
          content: (
            <label className="flex items-center justify-between gap-3 rounded-surface border border-border bg-background px-4 py-3 opacity-90">
              <span className="text-sm font-medium text-foreground">锁定系统通知</span>
              <Switch checked={true} disabled size="default" />
            </label>
          ),
          description: "禁用态用于展示只读配置。",
          title: "禁用态",
        },
      ]}
      description="Switch 适合即时生效的开关型配置，支持尺寸、禁用和轻加载态。"
      notes={["开关语义建议使用“启用/关闭 + 业务名称”。", "需要二次确认时先弹确认对话框再切换。"]}
      title="Switch"
    />
  );
}

function CheckboxPage() {
  const [approved, setApproved] = useState(false);

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"default"', description: "尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "false", description: "是否为错误态。", name: "invalid", type: "boolean" },
        { defaultValue: "false", description: "是否禁用。", name: "disabled", type: "boolean" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Checkbox checked={approved} onCheckedChange={(value) => setApproved(value === true)} />`,
          content: (
            <label className="flex items-center gap-3 rounded-surface border border-border bg-background px-4 py-3">
              <Checkbox checked={approved} onCheckedChange={(value) => setApproved(value === true)} />
              <span className="text-sm font-medium text-foreground">上线前必须审批</span>
            </label>
          ),
          description: "确认类与布尔选择基础场景。",
          title: "基础用法",
        },
        {
          code: `<RowActions>
  <Checkbox checked={true} size="large" />
  <Checkbox checked="indeterminate" />
  <Checkbox invalid />
</RowActions>`,
          content: (
            <RowActions>
              <Checkbox checked={true} size="large" />
              <Checkbox checked="indeterminate" />
              <Checkbox invalid />
            </RowActions>
          ),
          description: "尺寸、半选和错误态。",
          title: "尺寸与状态",
        },
        {
          code: `<RowActions>
  <Checkbox disabled />
  <Checkbox checked="indeterminate" disabled />
</RowActions>`,
          content: (
            <RowActions>
              <Checkbox disabled />
              <Checkbox checked="indeterminate" disabled />
            </RowActions>
          ),
          description: "禁用和禁用半选态。",
          title: "禁用态",
        },
      ]}
      description="Checkbox 适合勾选确认和列表选择，统一支持尺寸、错误态、禁用态与半选态。"
      notes={["互斥选择请使用 RadioGroup。", "配置开关场景优先使用 Switch。"]}
      title="Checkbox"
    />
  );
}

function RadioGroupPage() {
  const [env, setEnv] = useState("staging");

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"vertical"', description: "编排方向。", name: "direction", type: '"horizontal" | "vertical"' },
        { defaultValue: '"default"', description: "单选尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: "false", description: "是否为错误态。", name: "invalid", type: "boolean" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<RadioGroup onValueChange={setEnv} value={env}>...</RadioGroup>`,
          content: (
            <RadioGroup onValueChange={setEnv} value={env}>
              <label className="flex items-center gap-3 rounded-surface border border-border bg-background px-4 py-3">
                <RadioGroupItem value="dev" />
                <span className="text-sm text-foreground">开发环境</span>
              </label>
              <label className="flex items-center gap-3 rounded-surface border border-border bg-background px-4 py-3">
                <RadioGroupItem value="staging" />
                <span className="text-sm text-foreground">预发环境</span>
              </label>
              <label className="flex items-center gap-3 rounded-surface border border-border bg-background px-4 py-3">
                <RadioGroupItem value="prod" />
                <span className="text-sm text-foreground">生产环境</span>
              </label>
            </RadioGroup>
          ),
          description: "默认纵向布局适合表单录入。",
          title: "纵向基础",
        },
        {
          code: `<RadioGroup direction="horizontal" defaultValue="blue">...</RadioGroup>`,
          content: (
            <RadioGroup defaultValue="blue" direction="horizontal">
              <label className="flex items-center gap-2">
                <RadioGroupItem size="large" value="blue" />
                <span className="text-sm text-foreground">蓝绿发布</span>
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem size="small" value="canary" />
                <span className="text-sm text-foreground">金丝雀发布</span>
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="manual" />
                <span className="text-sm text-foreground">人工执行</span>
              </label>
            </RadioGroup>
          ),
          description: "横向展示和尺寸混排。",
          title: "横向与尺寸",
        },
        {
          code: `<RadioGroup defaultValue="manual">
  <RadioGroupItem invalid value="manual" />
</RadioGroup>`,
          content: (
            <RadioGroup defaultValue="manual">
              <label className="flex items-center gap-2">
                <RadioGroupItem invalid value="manual" />
                <span className="text-sm text-foreground">人工执行（错误态）</span>
              </label>
            </RadioGroup>
          ),
          description: "错误态用于表单校验反馈。",
          title: "错误态",
        },
      ]}
      description="RadioGroup 用于互斥选项，支持横向/纵向编排、尺寸与错误态。"
      notes={["互斥选项不要用多个 Checkbox 模拟。", "选项较长时建议整行可点击。"]}
      title="RadioGroup"
    />
  );
}

function TextareaPage() {
  const [description, setDescription] = useState("这次发布只更新任务执行模块，不调整权限模型。");

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"default"', description: "输入框尺寸。", name: "size", type: '"large" | "default" | "small"' },
        { defaultValue: '"default"', description: "状态。", name: "status", type: '"default" | "error"' },
        { defaultValue: "false", description: "是否展示字数统计。", name: "showCount", type: "boolean" },
        { defaultValue: "false", description: "是否允许按 Tab 用 placeholder 文案补全文本。", name: "completePlaceholderOnTab", type: "boolean" },
        { defaultValue: "false", description: "是否禁用。", name: "disabled", type: "boolean" },
        { description: "行数。", name: "rows", type: "number" },
        { description: "受控值。", name: "value", type: "string" },
        { description: "输入回调。", name: "onChange", type: "(event: ChangeEvent<HTMLTextAreaElement>) => void" },
        { description: "最大字数。", name: "maxLength", type: "number" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Textarea
  value={description}
  onChange={(event) => setDescription(event.target.value)}
  maxLength={120}
  showCount
/>`,
          content: (
            <FormField description="默认尺寸 + 字数统计。" label="变更说明">
              <Textarea
                maxLength={120}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="补充说明..."
                showCount
                value={description}
              />
            </FormField>
          ),
          description: "多行说明录入基础示例。",
          title: "基础与字数统计",
        },
        {
          code: `<Textarea size="small" rows={3} />
<Textarea status="error" rows={3} />`,
          content: (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Small">
                <Textarea defaultValue="小尺寸备注输入。" rows={3} size="small" />
              </FormField>
              <FormField error="审批意见不能为空" label="错误态">
                <Textarea placeholder="请输入审批意见" rows={3} status="error" value="" />
              </FormField>
            </div>
          ),
          description: "尺寸和错误态。",
          title: "尺寸与状态",
        },
        {
          code: `<Textarea
  completePlaceholderOnTab
  defaultValue="请在变更窗口内"
  placeholder="请在变更窗口内完成灰度、观测与回滚预案确认。"
/>`,
          content: (
            <FormField description="输入开头后按 Tab，可直接接受模板建议。" label="Tab 补全">
              <Textarea
                completePlaceholderOnTab
                defaultValue="请在变更窗口内"
                placeholder="请在变更窗口内完成灰度、观测与回滚预案确认。"
                rows={4}
              />
            </FormField>
          ),
          description: "模板化文案输入时可提升效率。",
          title: "Tab 补全",
        },
        {
          code: `<Form onSubmit={(event) => event.preventDefault()}>
  <FormField label="发布说明">
    <Textarea rows={4} showCount maxLength={200} />
  </FormField>
  <FormField label="审批意见">
    <Textarea disabled rows={3} value="该字段由审批节点自动回填" />
  </FormField>
</Form>`,
          content: (
            <Form className="grid gap-4 rounded-2xl border border-border/70 bg-secondary/20 p-4" onSubmit={(event) => event.preventDefault()}>
              <FormField description="作为主说明字段承接较长输入。" label="发布说明">
                <Textarea maxLength={200} placeholder="请填写变更背景、影响范围、回滚路径。" rows={4} showCount />
              </FormField>
              <FormField label="审批意见（只读）">
                <Textarea disabled rows={3} value="该字段由审批节点自动回填" />
              </FormField>
            </Form>
          ),
          description: "表单承接示例覆盖可编辑与只读禁用场景。",
          title: "表单承接",
        },
      ]}
      description="Textarea 用于中短文本说明，支持尺寸、错误态、字数统计与可选 Tab 补全。"
      notes={[
        "富文本场景请升级为独立编辑器。",
        "Tab 补全只建议在模板型录入场景开启。",
        "长文本字段建议在 FormField 中配合字数限制与用途说明一起出现。",
      ]}
      title="Textarea"
    />
  );
}

function FormFieldPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "字段标题。", name: "label", required: true, type: "ReactNode" },
        { description: "说明文案。", name: "description", type: "ReactNode" },
        { description: "错误文案。", name: "error", type: "ReactNode" },
        { defaultValue: "false", description: "是否必填。", name: "required", type: "boolean" },
        { description: "字段内容。", name: "children", required: true, type: "ReactNode" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<FormField label="服务名称" description="系统内唯一标识">
  <Input placeholder="请输入服务名称" />
</FormField>`,
          content: (
            <FormField description="系统内唯一标识" label="服务名称">
              <Input placeholder="请输入服务名称" value="ops-worker" />
            </FormField>
          ),
          description: "字段容器标准结构。",
          title: "标准字段",
        },
        {
          code: `<FormField required error="名称不能为空" label="服务名称">
  <Input aria-invalid="true" value="" />
</FormField>`,
          content: (
            <FormField error="名称不能为空" label="失败示例" required>
              <Input aria-invalid="true" placeholder="请输入服务名称" value="" />
            </FormField>
          ),
          description: "必填与错误反馈组合。",
          title: "必填与错误",
        },
        {
          code: `<Label>独立标签</Label>
<Input placeholder="..." />
<HelpText>用于独立展示标签和帮助文案。</HelpText>
<FieldError>这是单独使用的错误提示组件。</FieldError>`,
          content: (
            <div className="grid gap-2">
              <Label>独立标签</Label>
              <Input placeholder="直接组合 Label / HelpText / FieldError" />
              <HelpText>用于独立展示标签和帮助文案。</HelpText>
              <FieldError>这是单独使用的错误提示组件。</FieldError>
            </div>
          ),
          description: "原子组件可单独组合使用。",
          title: "原子组合",
        },
      ]}
      description="FormField 组合 Label、HelpText、FieldError，作为表单字段的标准包裹层。"
      notes={["优先通过 FormField 承接字段语义，不要手写散落标签布局。", "错误文案应放在字段下方，避免遮挡输入焦点。"]}
      title="FormField"
    />
  );
}

function FormPage() {
  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"vertical"', description: "表单布局方向。", name: "layout", type: '"vertical" | "inline"' },
        { description: "表单内容。", name: "children", required: true, type: "ReactNode" },
        { description: "操作按钮容器。", name: "FormActions", type: "ReactNode wrapper" },
        { description: "字段容器。", name: "FormField", type: "ReactNode wrapper" },
        { description: "原生 form 属性，如 onSubmit。", name: "...props", type: "FormHTMLAttributes<HTMLFormElement>" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Form onSubmit={(event) => event.preventDefault()}>
  <FormField label="服务名称">
    <Input completePlaceholderOnTab defaultValue="release" placeholder="release-orchestrator" />
  </FormField>
  <FormField label="变更说明">
    <Textarea completePlaceholderOnTab rows={4} />
  </FormField>
  <FormActions>
    <Button type="button" variant="default">取消</Button>
    <Button type="submit">提交</Button>
  </FormActions>
</Form>`,
          content: (
            <Form onSubmit={(event) => event.preventDefault()}>
              <FormField description="按 Tab 可以接受建议值。" label="服务名称">
                <Input completePlaceholderOnTab defaultValue="release" placeholder="release-orchestrator" />
              </FormField>
              <FormField label="变更说明">
                <Textarea completePlaceholderOnTab placeholder="请说明影响范围、回滚预案和观测指标。" rows={4} />
              </FormField>
              <FormActions>
                <Button type="button" variant="default">取消</Button>
                <Button type="submit">提交</Button>
              </FormActions>
            </Form>
          ),
          description: "常规编辑场景推荐 vertical 布局。",
          title: "Vertical 表单",
        },
        {
          code: `<Form layout="inline" onSubmit={(event) => event.preventDefault()}>
  <FormField className="min-w-[220px] flex-1" label="关键词">
    <Input prefix={<Search className="h-4 w-4" />} placeholder="输入服务名筛选" />
  </FormField>
  <FormField className="min-w-[220px] flex-1" label="机房">
    <Select onValueChange={() => undefined} options={selectOptions} placeholder="请选择机房" />
  </FormField>
  <FormActions className="self-end">
    <Button type="button" variant="default">重置</Button>
    <Button type="submit">查询</Button>
  </FormActions>
</Form>`,
          content: (
            <Form className="rounded-2xl border border-border/70 bg-secondary/20 p-4" layout="inline" onSubmit={(event) => event.preventDefault()}>
              <FormField className="min-w-[220px] flex-1" label="关键词">
                <Input placeholder="输入服务名筛选" prefix={<Search className="h-4 w-4" />} />
              </FormField>
              <FormField className="min-w-[220px] flex-1" label="机房">
                <Select onValueChange={() => undefined} options={selectOptions} placeholder="请选择机房" />
              </FormField>
              <FormActions className="self-end">
                <Button type="button" variant="default">重置</Button>
                <Button type="submit">查询</Button>
              </FormActions>
            </Form>
          ),
          description: "筛选条等紧凑区域使用 inline 布局。",
          title: "Inline 筛选表单",
        },
        {
          code: `<Form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
  <FormField required error="服务名不能为空" label="服务名称">
    <Input status="error" value="" />
  </FormField>
  <FormField required label="发布时间">
    <DatePicker onChange={() => undefined} value={new Date()} />
  </FormField>
  <FormField label="备注">
    <Textarea disabled rows={3} value="审批后自动生成" />
  </FormField>
  <FormActions>
    <Button type="button" variant="default">取消</Button>
    <Button type="submit">保存</Button>
  </FormActions>
</Form>`,
          content: (
            <Form className="grid gap-4 rounded-2xl border border-border/70 bg-secondary/20 p-4" onSubmit={(event) => event.preventDefault()}>
              <FormField error="服务名不能为空" label="服务名称" required>
                <Input placeholder="请输入服务名称" status="error" value="" />
              </FormField>
              <FormField label="发布时间" required>
                <DatePicker onChange={() => undefined} value={new Date("2026-04-09")} />
              </FormField>
              <FormField label="备注（只读）">
                <Textarea disabled rows={3} value="审批后自动生成" />
              </FormField>
              <FormActions>
                <Button type="button" variant="default">取消</Button>
                <Button type="submit">保存</Button>
              </FormActions>
            </Form>
          ),
          description: "覆盖必填、错误态、禁用字段与提交区，形成完整编辑流。",
          title: "状态与提交流",
        },
        {
          code: `<Form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
  <FormField label="变更批次">
    <Input prepend="release-" completePlaceholderOnTab placeholder="release-20260409-01" />
  </FormField>
  <FormField label="变更说明">
    <Textarea completePlaceholderOnTab rows={4} placeholder="请补充影响面、观测项和回滚策略。" />
  </FormField>
</Form>`,
          content: (
            <Form className="grid gap-4 rounded-2xl border border-border/70 p-4" onSubmit={(event) => event.preventDefault()}>
              <FormField description="按 Tab 可快速补全文档模板。" label="变更批次">
                <Input completePlaceholderOnTab placeholder="release-20260409-01" prepend="release-" />
              </FormField>
              <FormField label="变更说明">
                <Textarea completePlaceholderOnTab placeholder="请补充影响面、观测项和回滚策略。" rows={4} />
              </FormField>
              <FormActions>
                <Button type="submit">生成草稿</Button>
              </FormActions>
            </Form>
          ),
          description: "模板化录入场景下，Form 统一承接 Tab 补全策略。",
          title: "模板化录入",
        },
      ]}
      description="Form 作为容器负责字段分组节奏，支持 vertical 与 inline 两种布局。"
      notes={[
        "Form 不负责校验状态机，校验信息由 FormField 和具体控件承接。",
        "筛选栏优先 inline，编辑表单优先 vertical。",
        "推荐将字段、操作区、状态表达保持在同一个 Form 语义内，避免页面级零散拼装。",
      ]}
      title="Form"
    />
  );
}

function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date("2026-04-09"));
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: new Date("2026-04-08"),
    to: new Date("2026-04-12"),
  });
  const [selectedDates, setSelectedDates] = useState<Date[]>([
    new Date("2026-04-09"),
    new Date("2026-04-11"),
  ]);

  return (
    <ShowcaseDocPage
      apiItems={[
        { defaultValue: '"single"', description: "日历选择模式。", name: "mode", type: '"single" | "multiple" | "range"' },
        { description: "当前选中值。", name: "selected", type: "Date | Date[] | DateRange" },
        { description: "选中变化回调。", name: "onSelect", type: "(value) => void" },
        { defaultValue: "1", description: "展示月份数量。", name: "numberOfMonths", type: "number" },
        { defaultValue: "true", description: "是否展示非本月日期。", name: "showOutsideDays", type: "boolean" },
        { description: "禁用日期规则。", name: "disabled", type: "Matcher | Matcher[]" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Calendar selected={selectedDate} onSelect={setSelectedDate} />`,
          content: <Calendar onSelect={setSelectedDate} selected={selectedDate} />,
          description: "基础单日选择，适合排班、预约和日历选择器页内嵌入。",
          title: "单日选择",
        },
        {
          code: `<Calendar
  mode="range"
  numberOfMonths={2}
  onSelect={setSelectedRange}
  selected={selectedRange}
/>`,
          content: (
            <Calendar
              mode="range"
              numberOfMonths={2}
              onSelect={setSelectedRange}
              selected={selectedRange}
            />
          ),
          description: "双月联动更接近 Element Plus 在时间范围选择上的阅读体验。",
          title: "范围与双月视图",
        },
        {
          code: `<Calendar
  mode="multiple"
  disabled={{ before: new Date() }}
  onSelect={setSelectedDates}
  selected={selectedDates}
/>`,
          content: (
            <Calendar
              disabled={{ before: new Date("2026-04-08") }}
              mode="multiple"
              onSelect={(value) => setSelectedDates(value ?? [])}
              selected={selectedDates}
            />
          ),
          description: "多选日历适合活动档期、发布窗口和多日签到这类场景。",
          title: "多选与禁用态",
        },
        {
          code: `<Form className="gap-4">
  <FormField label="维护窗口">
    <Calendar mode="range" numberOfMonths={2} />
  </FormField>
  <FormActions>...</FormActions>
</Form>`,
          content: (
            <Form className="gap-4">
              <FormField description="直接作为页内结构化选择区，不一定总是挂在弹层里。" label="维护窗口">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  onSelect={setSelectedRange}
                  selected={selectedRange}
                />
              </FormField>
              <FormActions>
                <Button type="button" variant="outline">取消</Button>
                <Button type="button">确认窗口</Button>
              </FormActions>
            </Form>
          ),
          description: "Calendar 可直接承接表单块，而不是只能通过 DatePicker 间接使用。",
          title: "表单承接",
        },
      ]}
      description="Calendar 提供始终可见的日历面板，适合时间窗口、排期和计划类后台场景。"
      notes={[
        "单日选择优先用于明确日期决策，范围选择用于发布窗口和统计区间。",
        "多月份视图适合范围场景，单月份视图更适合嵌入式小面板。",
        "需要输入框交互时优先用 DatePicker / DateRangePicker；需要持续可见时再用 Calendar。",
      ]}
      title="Calendar"
    />
  );
}

function UploadPage() {
  const [textFiles, setTextFiles] = useState<UploadFileItem[]>([
    { id: "deploy-doc", name: "deploy-plan.pdf", size: 146_800, status: "success" as const },
  ]);
  const [cardFiles, setCardFiles] = useState<UploadFileItem[]>([
    { id: "banner", name: "release-banner.png", size: 812_000, status: "ready" as const },
    { id: "rollback", name: "rollback-note.md", size: 8_540, status: "success" as const },
  ]);

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "当前文件列表，支持受控模式。", name: "fileList", type: "UploadFileItem[]" },
        { description: "默认文件列表。", name: "defaultFileList", type: "UploadFileItem[]" },
        { defaultValue: "false", description: "是否支持拖拽上传。", name: "drag", type: "boolean" },
        { defaultValue: "false", description: "是否允许多文件。", name: "multiple", type: "boolean" },
        { description: "最大文件数量。", name: "limit", type: "number" },
        { description: "上传前校验。", name: "beforeUpload", type: "(file: File) => boolean | Promise<boolean>" },
        { description: "文件列表变化回调。", name: "onFileListChange", type: "(next: UploadFileItem[]) => void" },
        { defaultValue: '"text"', description: "列表展示风格。", name: "listType", type: '"text" | "card"' },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<Upload
  accept=".pdf,.md"
  fileList={files}
  helperText="上传发布说明与回滚文档"
  onFileListChange={setFiles}
/>`,
          content: (
            <Upload
              accept=".pdf,.md"
              fileList={textFiles}
              helperText="上传发布说明、回滚文档和值班手册。"
              onFileListChange={setTextFiles}
            />
          ),
          description: "文本列表更适合后台表单场景，信息密度更高。",
          title: "基础文件列表",
        },
        {
          code: `<Upload
  drag
  listType="card"
  multiple
  limit={4}
  fileList={files}
  onFileListChange={setFiles}
/>`,
          content: (
            <Upload
              drag
              fileList={cardFiles}
              helperText="适合截图、素材和多个交付件同时上传。"
              limit={4}
              listType="card"
              multiple
              onFileListChange={setCardFiles}
            />
          ),
          description: "卡片模式更适合图像、附件包和多文件素材集。",
          title: "拖拽与卡片模式",
        },
        {
          code: `<Upload
  accept=".png,.jpg"
  beforeUpload={async (file) => file.size < 1024 * 1024}
  onExceed={() => toast.warning("最多上传 2 个文件")}
  limit={2}
/>`,
          content: (
            <Upload
              accept=".png,.jpg"
              beforeUpload={async (file) => {
                const allowed = file.size < 1024 * 1024;
                if (!allowed) {
                  toast.error("单个文件不能超过 1MB");
                }
                return allowed;
              }}
              helperText="用于头像、封面和活动图等轻量资源。"
              limit={2}
              onExceed={() => toast.warning("最多上传 2 个文件")}
            />
          ),
          description: "通过 beforeUpload 和 limit 统一收敛业务页自己的校验逻辑。",
          title: "上传前校验",
        },
        {
          code: `<Form className="gap-4">
  <FormField label="交付附件">
    <Upload drag multiple />
  </FormField>
  <FormActions>...</FormActions>
</Form>`,
          content: (
            <Form className="gap-4">
              <FormField description="表单场景下由 Upload 负责列表承接，不再额外拼一层附件区。" label="交付附件">
                <Upload
                  drag
                  helperText="支持发布包、说明文档和回滚附件。"
                  multiple
                  onFileListChange={setCardFiles}
                />
              </FormField>
              <FormActions>
                <Button type="button" variant="outline">保存草稿</Button>
                <Button type="button">提交审核</Button>
              </FormActions>
            </Form>
          ),
          description: "完整表单录入里，Upload 应直接成为字段的一部分。",
          title: "表单承接",
        },
      ]}
      description="Upload 对齐后台附件上传体验，支持文本列表、卡片列表、拖拽和上传前校验。"
      notes={[
        "上传组件负责文件列表和基础交互，不负责真实上传状态机编排。",
        "拖拽模式更适合素材、截图和多附件；纯表单附件优先文本列表。",
        "限制文件数、大小和格式应统一放在 beforeUpload / limit 中，不要散落在页面里。",
      ]}
      title="Upload"
    />
  );
}

function ImageCaptchaFieldPage() {
  const [captchaUuid, setCaptchaUuid] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <ShowcaseDocPage
      apiItems={[
        { description: "验证码加载函数，返回 uuid 与图片内容。", name: "getCaptcha", required: true, type: "() => Promise<{ image: string; uuid: string }>" },
        { description: "图片 alt 文案。", name: "imageAlt", required: true, type: "string" },
        { description: "输入框透传属性。", name: "inputProps", type: "ComponentProps<typeof Input>" },
        { description: "刷新按钮空态文案。", name: "refreshLabel", required: true, type: "string" },
        { description: "刷新结果回调。", name: "onCaptchaChange", type: "(payload) => void" },
        { description: "外部刷新 token。", name: "refreshToken", type: "number | string" },
      ]}
      categoryLabel="表单输入"
      demos={[
        {
          code: `<ImageCaptchaField
  getCaptcha={createDemoCaptcha}
  imageAlt="验证码"
  inputProps={{ placeholder: "请输入验证码" }}
  refreshLabel="刷新验证码"
/>`,
          content: (
            <FormField description="适合登录、重置密码和敏感操作校验等场景。" label="基础用法">
              <ImageCaptchaField
                getCaptcha={createDemoCaptcha}
                imageAlt="验证码"
                inputProps={{ placeholder: "请输入验证码" }}
                onCaptchaChange={(payload) => setCaptchaUuid(payload?.uuid ?? "")}
                refreshLabel="刷新验证码"
              />
            </FormField>
          ),
          description: "把输入框、图片预览和刷新动作收敛成一个标准字段组件。",
          title: "基础验证码字段",
        },
        {
          code: `<ImageCaptchaField
  getCaptcha={createDemoCaptcha}
  imageAlt="发布验证"
  inputProps={{ placeholder: "输入校验码" }}
  refreshLabel="点击刷新"
  refreshToken={refreshToken}
/>`,
          content: (
            <div className="grid gap-4">
              <FormField description={`最近一次验证码 uuid：${captchaUuid || "未拉取"}`} label="业务侧重置">
                <ImageCaptchaField
                  getCaptcha={createDemoCaptcha}
                  imageAlt="发布验证"
                  inputProps={{ placeholder: "输入校验码" }}
                  onCaptchaChange={(payload) => setCaptchaUuid(payload?.uuid ?? "")}
                  refreshLabel="点击刷新"
                  refreshToken={refreshToken}
                />
              </FormField>
              <FormActions>
                <Button onClick={() => setRefreshToken((current) => current + 1)} type="button" variant="outline">
                  外部触发刷新
                </Button>
              </FormActions>
            </div>
          ),
          description: "当业务层需要重新拉取验证码时，直接更新 refreshToken 即可驱动刷新。",
          title: "外部刷新控制",
        },
      ]}
      description="ImageCaptchaField 把验证码输入、图片拉取和刷新节流能力封成标准字段，避免登录页和敏感操作页各自重复实现。"
      notes={[
        "验证码字段应作为 FormField 的一部分使用，不在页面里手动拼输入框和图片按钮。",
        "真正的图片获取逻辑由业务层提供，组件只负责承接刷新与展示。",
      ]}
      title="ImageCaptchaField"
    />
  );
}

export const formsRoutes: ShowcaseRoute[] = [
  { component: CalendarPage, label: "Calendar", path: "/forms/calendar", shortLabel: "CAL", summaryKey: "showcase.route.forms.calendar.summary" },
  { component: FormPage, label: "Form", path: "/forms/form", shortLabel: "FRM", summaryKey: "showcase.route.forms.form.summary" },
  { component: InputPage, label: "Input", path: "/forms/input", shortLabel: "TXT", summaryKey: "showcase.route.forms.input.summary" },
  { component: TextareaPage, label: "Textarea", path: "/forms/textarea", shortLabel: "TXT", summaryKey: "showcase.route.forms.textarea.summary" },
  { component: SelectPage, label: "Select", path: "/forms/select", shortLabel: "SEL", summaryKey: "showcase.route.forms.select.summary" },
  { component: ComboboxPage, label: "Combobox", path: "/forms/combobox", shortLabel: "CBX", summaryKey: "showcase.route.forms.combobox.summary" },
  { component: DatePickerPage, label: "DatePicker", path: "/forms/date-picker", shortLabel: "DAY", summaryKey: "showcase.route.forms.date-picker.summary" },
  { component: DateRangePickerPage, label: "DateRangePicker", path: "/forms/date-range-picker", shortLabel: "RNG", summaryKey: "showcase.route.forms.date-range-picker.summary" },
  { component: FormFieldPage, label: "FormField", path: "/forms/form-field", shortLabel: "FLD", summaryKey: "showcase.route.forms.form-field.summary" },
  { component: SwitchPage, label: "Switch", path: "/forms/switch", shortLabel: "SWT", summaryKey: "showcase.route.forms.switch.summary" },
  { component: CheckboxPage, label: "Checkbox", path: "/forms/checkbox", shortLabel: "CHK", summaryKey: "showcase.route.forms.checkbox.summary" },
  { component: RadioGroupPage, label: "RadioGroup", path: "/forms/radio-group", shortLabel: "RAD", summaryKey: "showcase.route.forms.radio-group.summary" },
  { component: ImageCaptchaFieldPage, label: "ImageCaptchaField", path: "/forms/image-captcha-field", shortLabel: "CAP", summaryKey: "showcase.route.forms.image-captcha-field.summary" },
  { component: UploadPage, label: "Upload", path: "/forms/upload", shortLabel: "UPL", summaryKey: "showcase.route.forms.upload.summary" },
];

export const formsCategory: ShowcaseCategory = {
  descriptionKey: "showcase.category.forms.description",
  key: "forms",
  labelKey: "showcase.category.forms.label",
  items: formsRoutes,
};
