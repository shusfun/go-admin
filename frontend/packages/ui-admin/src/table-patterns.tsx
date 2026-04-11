import { Activity, ArrowUpRight, Columns3, Filter, FolderKanban, Search, Settings2, SplitSquareVertical } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AppScrollbar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DetailGrid,
  Input,
  ReadonlyCodeBlock,
  Tabs,
  TabsList,
  TabsTrigger,
} from "./primitives";
import { DetailPane, ListPane, MasterDetailLayout } from "./layout";
import { cn } from "./lib/utils";

type BadgeTone = "danger" | "default" | "info" | "muted" | "primary" | "success" | "warning";

type WorkbenchViewKey = "default" | "finance" | "fulfillment" | "risk";

type WorkbenchRow = {
  amount: number;
  channel: string;
  code: string;
  contact: string;
  id: string;
  lastTouch: string;
  name: string;
  nextAction: string;
  owner: string;
  paymentStatus: string;
  region: string;
  riskLevel: string;
  segment: string;
  source: string;
  tags: string[];
  updatedAt: string;
  fulfillmentStatus: string;
};

type WorkbenchColumnKey = "owner" | "journey" | "amount" | "source" | "tags" | "followUp" | "risk" | "updated";

type RecordViewKey = "all" | "pending" | "exception" | "completed";

type DetailRecord = {
  actor: string;
  category: string;
  createdAt: string;
  id: string;
  note: string;
  payload: string;
  priority: string;
  result: string;
  source: string;
  status: string;
  summary: string;
  timeline: string[];
  title: string;
};

type GroupDimensionKey = "phase" | "region";

type GroupMetricRow = {
  agedStock: number;
  channel: string;
  followUp: string;
  fulfilRate: number;
  grossMargin: number;
  id: string;
  manager: string;
  orders: number;
  pending: number;
  phase: string;
  refundRate: number;
  region: string;
  storeCode: string;
  storeName: string;
};

const workbenchRows: WorkbenchRow[] = [
  {
    amount: 128000,
    channel: "小程序",
    code: "ORD-240401",
    contact: "138****8899",
    id: "1",
    lastTouch: "今天 10:24",
    name: "华东门店补货单",
    nextAction: "确认履约节奏",
    owner: "王五",
    paymentStatus: "已支付",
    region: "华东",
    riskLevel: "低风险",
    segment: "重点客户",
    source: "巡店转化",
    tags: ["加急", "直营"],
    updatedAt: "2 分钟前",
    fulfillmentStatus: "待发货",
  },
  {
    amount: 86000,
    channel: "企业微信",
    code: "ORD-240389",
    contact: "137****3221",
    id: "2",
    lastTouch: "今天 09:58",
    name: "西南大客户框架单",
    nextAction: "催合同回传",
    owner: "李四",
    paymentStatus: "待付款",
    region: "西南",
    riskLevel: "中风险",
    segment: "新签客户",
    source: "销售线索",
    tags: ["合同中", "分批交付"],
    updatedAt: "18 分钟前",
    fulfillmentStatus: "排产中",
  },
  {
    amount: 223000,
    channel: "官网",
    code: "ORD-240377",
    contact: "136****1718",
    id: "3",
    lastTouch: "昨天 18:10",
    name: "华南季度备货计划",
    nextAction: "复核库存周转",
    owner: "周宁",
    paymentStatus: "已支付",
    region: "华南",
    riskLevel: "高风险",
    segment: "核心 KA",
    source: "主动续单",
    tags: ["高金额", "跨仓"],
    updatedAt: "1 小时前",
    fulfillmentStatus: "待排车",
  },
  {
    amount: 54000,
    channel: "门店导购",
    code: "ORD-240365",
    contact: "135****9802",
    id: "4",
    lastTouch: "昨天 16:30",
    name: "校园活动快闪包",
    nextAction: "补齐开票资料",
    owner: "陈晨",
    paymentStatus: "部分付款",
    region: "华北",
    riskLevel: "中风险",
    segment: "活动项目",
    source: "区域运营",
    tags: ["定制", "短交期"],
    updatedAt: "4 小时前",
    fulfillmentStatus: "已发货",
  },
  {
    amount: 99000,
    channel: "招商会",
    code: "ORD-240351",
    contact: "139****2201",
    id: "5",
    lastTouch: "前天 11:40",
    name: "西北联营首批进货",
    nextAction: "确认返利口径",
    owner: "高原",
    paymentStatus: "已支付",
    region: "西北",
    riskLevel: "低风险",
    segment: "联营拓展",
    source: "招商会",
    tags: ["新店", "陈列支持"],
    updatedAt: "昨天",
    fulfillmentStatus: "已签收",
  },
  {
    amount: 46000,
    channel: "客服转单",
    code: "ORD-240342",
    contact: "188****1021",
    id: "6",
    lastTouch: "前天 09:15",
    name: "售后补发处理单",
    nextAction: "核销差价",
    owner: "赵敏",
    paymentStatus: "免付款",
    region: "华中",
    riskLevel: "高风险",
    segment: "售后补偿",
    source: "客诉处理",
    tags: ["售后", "人工审批"],
    updatedAt: "昨天",
    fulfillmentStatus: "处理中",
  },
];

const workbenchViewConfig: Record<
  WorkbenchViewKey,
  {
    columns: WorkbenchColumnKey[];
    description: string;
    filter: (row: WorkbenchRow) => boolean;
    label: string;
  }
> = {
  default: {
    columns: ["owner", "journey", "amount", "source", "tags", "updated"],
    description: "面向日常跟单，保持主身份列 + 决策列的最小集合。",
    filter: () => true,
    label: "默认视图",
  },
  finance: {
    columns: ["owner", "amount", "source", "risk", "followUp", "updated"],
    description: "把金额、回款风险、后续动作提到前面，不强迫财务扫履约细节。",
    filter: (row) => row.paymentStatus !== "免付款",
    label: "财务视图",
  },
  fulfillment: {
    columns: ["owner", "journey", "followUp", "tags", "risk", "updated"],
    description: "保留履约状态和下一步动作，适合仓配和交付跟进。",
    filter: (row) => row.fulfillmentStatus !== "已签收",
    label: "履约视图",
  },
  risk: {
    columns: ["owner", "risk", "amount", "source", "followUp", "updated"],
    description: "高风险记录会被自动前置，默认隐藏低风险噪声。",
    filter: (row) => row.riskLevel !== "低风险",
    label: "风险视图",
  },
};

const detailRecords: DetailRecord[] = [
  {
    actor: "系统任务",
    category: "自动巡检",
    createdAt: "今天 10:36",
    id: "log-1",
    note: "接口重试成功，但首包耗时明显偏高，建议观察网关限流。",
    payload: "{\n  \"requestId\": \"req-240410-101\",\n  \"env\": \"prod\",\n  \"retry\": 1,\n  \"latencyMs\": 1820,\n  \"status\": 200\n}",
    priority: "P1",
    result: "首包超时后重试成功",
    source: "网关巡检",
    status: "待复核",
    summary: "支付回调链路在 10:35 出现波峰，自动重试后恢复正常。",
    timeline: ["10:35 触发异常阈值", "10:35 自动重试", "10:36 请求恢复成功", "10:37 等待人工复核"],
    title: "支付回调延迟波动",
  },
  {
    actor: "陈晨",
    category: "人工处理",
    createdAt: "今天 09:42",
    id: "log-2",
    note: "门店反馈价格标签未同步，已手动重跑并通知运营确认。",
    payload: "{\n  \"job\": \"sync_price_tag\",\n  \"storeCode\": \"HD-018\",\n  \"batch\": \"B-90321\",\n  \"rerun\": true\n}",
    priority: "P2",
    result: "二次同步成功",
    source: "门店后台",
    status: "已完成",
    summary: "价格标签同步任务第一次执行失败，人工重跑后完成。",
    timeline: ["09:20 门店提报", "09:28 定位批次错误", "09:36 手动重跑", "09:42 运营确认完成"],
    title: "价格标签同步失败",
  },
  {
    actor: "王五",
    category: "审批节点",
    createdAt: "昨天 18:20",
    id: "log-3",
    note: "待法务确认返利补充条款，目前不建议推进出货。",
    payload: "{\n  \"contractId\": \"CT-8821\",\n  \"customer\": \"西南大客户\",\n  \"approvalNode\": \"legal_review\",\n  \"blocking\": true\n}",
    priority: "P1",
    result: "卡在法务复核",
    source: "合同中心",
    status: "待处理",
    summary: "框架单返利条款存在分歧，审批停留在法务节点超过 12 小时。",
    timeline: ["17:08 销售提交审批", "17:15 风控通过", "17:20 法务要求补充", "18:20 仍未完成"],
    title: "返利条款审批卡点",
  },
  {
    actor: "赵敏",
    category: "异常告警",
    createdAt: "昨天 16:54",
    id: "log-4",
    note: "涉及售后补偿和人工审批，建议保留明细，不要继续往主表加字段。",
    payload: "{\n  \"ticketId\": \"TS-1123\",\n  \"afterSale\": true,\n  \"manualApproval\": true,\n  \"amountDelta\": 380\n}",
    priority: "P0",
    result: "等待售后经理确认",
    source: "客诉系统",
    status: "异常",
    summary: "售后补发金额与原订单差额不一致，已触发风控复核。",
    timeline: ["16:12 客诉创建", "16:20 自动核价", "16:31 差额异常", "16:54 风控挂起"],
    title: "售后补发差额异常",
  },
  {
    actor: "系统任务",
    category: "履约回传",
    createdAt: "昨天 14:08",
    id: "log-5",
    note: "第三方物流接口偶发慢，但业务结果正确。",
    payload: "{\n  \"shipmentId\": \"SF-990123\",\n  \"provider\": \"第三方物流\",\n  \"callbackMs\": 910,\n  \"status\": \"signed\"\n}",
    priority: "P3",
    result: "已签收",
    source: "物流平台",
    status: "已完成",
    summary: "履约回传完成，只有外部接口耗时偏高。",
    timeline: ["13:42 发货", "13:58 出库", "14:05 物流回传", "14:08 签收入库"],
    title: "签收回传延迟",
  },
];

const groupMetricRows: GroupMetricRow[] = [
  {
    agedStock: 36,
    channel: "直营",
    followUp: "下调补货阈值",
    fulfilRate: 94,
    grossMargin: 31,
    id: "store-1",
    manager: "王五",
    orders: 421,
    pending: 18,
    phase: "健康运行",
    refundRate: 1.6,
    region: "华东",
    storeCode: "HD-018",
    storeName: "上海静安旗舰店",
  },
  {
    agedStock: 52,
    channel: "联营",
    followUp: "补录返利规则",
    fulfilRate: 88,
    grossMargin: 27,
    id: "store-2",
    manager: "李四",
    orders: 308,
    pending: 29,
    phase: "跟进中",
    refundRate: 2.1,
    region: "华东",
    storeCode: "HD-024",
    storeName: "杭州湖滨体验店",
  },
  {
    agedStock: 74,
    channel: "加盟",
    followUp: "核对老库存结构",
    fulfilRate: 81,
    grossMargin: 22,
    id: "store-3",
    manager: "周宁",
    orders: 252,
    pending: 47,
    phase: "风险关注",
    refundRate: 3.4,
    region: "华南",
    storeCode: "HN-011",
    storeName: "广州天河中心店",
  },
  {
    agedStock: 29,
    channel: "直营",
    followUp: "维持当前配额",
    fulfilRate: 96,
    grossMargin: 34,
    id: "store-4",
    manager: "陈晨",
    orders: 510,
    pending: 11,
    phase: "健康运行",
    refundRate: 1.1,
    region: "华南",
    storeCode: "HN-021",
    storeName: "深圳南山旗舰店",
  },
  {
    agedStock: 63,
    channel: "直营",
    followUp: "增加夜间波次",
    fulfilRate: 84,
    grossMargin: 25,
    id: "store-5",
    manager: "高原",
    orders: 287,
    pending: 41,
    phase: "跟进中",
    refundRate: 2.8,
    region: "西南",
    storeCode: "XN-007",
    storeName: "成都太古里店",
  },
  {
    agedStock: 91,
    channel: "加盟",
    followUp: "暂停高风险 SKU",
    fulfilRate: 73,
    grossMargin: 19,
    id: "store-6",
    manager: "赵敏",
    orders: 166,
    pending: 58,
    phase: "风险关注",
    refundRate: 4.6,
    region: "西北",
    storeCode: "XB-003",
    storeName: "西安曲江店",
  },
];

function formatAmount(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    currency: "CNY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function getPaymentTone(status: string): BadgeTone {
  if (status === "已支付") {
    return "success";
  }
  if (status === "部分付款") {
    return "warning";
  }
  if (status === "免付款") {
    return "info";
  }
  return "muted";
}

function getFulfillmentTone(status: string): BadgeTone {
  if (status === "已签收" || status === "已发货") {
    return "success";
  }
  if (status === "排产中" || status === "处理中") {
    return "warning";
  }
  return "primary";
}

function getRiskTone(level: string): BadgeTone {
  if (level === "高风险") {
    return "danger";
  }
  if (level === "中风险") {
    return "warning";
  }
  return "success";
}

function getRecordStatusTone(status: string): BadgeTone {
  if (status === "已完成") {
    return "success";
  }
  if (status === "异常") {
    return "danger";
  }
  if (status === "待处理" || status === "待复核") {
    return "warning";
  }
  return "muted";
}

function getPhaseTone(phase: string): BadgeTone {
  if (phase === "风险关注") {
    return "danger";
  }
  if (phase === "跟进中") {
    return "warning";
  }
  return "success";
}

function StickyCell({
  children,
  className,
  side,
}: {
  children: React.ReactNode;
  className?: string;
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "sticky bg-card transition-colors group-hover:bg-secondary/70",
        side === "left"
          ? "left-0 z-20 shadow-[10px_0_18px_-16px_hsl(var(--foreground)/0.45)]"
          : "right-0 z-20 shadow-[-10px_0_18px_-16px_hsl(var(--foreground)/0.45)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function PatternTabs({
  items,
  value,
  onValueChange,
}: {
  items: Array<{ label: string; value: string }>;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <Tabs onValueChange={onValueChange} value={value}>
      <TabsList className="h-auto flex-wrap justify-start rounded-2xl bg-secondary/50 p-1">
        {items.map((item) => (
          <TabsTrigger className="rounded-xl px-3 py-2 text-xs md:text-sm" key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function SectionIntro({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-primary/18 bg-primary/8 p-3 text-primary">{icon}</div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function VirtualizedSurface<Item>({
  empty,
  estimatedRowHeight,
  header,
  items,
  maxHeightClassName = "max-h-[34rem]",
  minWidthClassName,
  overscan = 4,
  renderRow,
}: {
  empty?: React.ReactNode;
  estimatedRowHeight: number;
  header: React.ReactNode;
  items: readonly Item[];
  maxHeightClassName?: string;
  minWidthClassName?: string;
  overscan?: number;
  renderRow: (item: Item, index: number) => React.ReactNode;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (!viewportElement) {
      return;
    }

    const updateMetrics = () => {
      setScrollTop(viewportElement.scrollTop);
      setViewportHeight(viewportElement.clientHeight);
    };

    updateMetrics();
    viewportElement.addEventListener("scroll", updateMetrics, { passive: true });

    if (typeof ResizeObserver === "undefined") {
      return () => {
        viewportElement.removeEventListener("scroll", updateMetrics);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(viewportElement);

    return () => {
      viewportElement.removeEventListener("scroll", updateMetrics);
      resizeObserver.disconnect();
    };
  }, [viewportElement]);

  const normalizedOverscan = Math.max(0, overscan);
  const safeHeight = Math.max(1, estimatedRowHeight);
  const visibleCount = Math.max(1, Math.ceil((viewportHeight || safeHeight * 6) / safeHeight));
  const startIndex = Math.max(0, Math.floor(scrollTop / safeHeight) - normalizedOverscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + normalizedOverscan * 2);
  const totalHeight = items.length * safeHeight;

  return (
    <AppScrollbar className={cn("w-full", maxHeightClassName)} viewportClassName="relative" viewportRef={setViewportElement}>
      <div className={cn("relative", minWidthClassName)}>
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/82">{header}</div>
        {items.length === 0 ? (
          <div className="rounded-b-[1.25rem] border border-t-0 border-dashed border-border/80 px-6 py-8 text-sm text-muted-foreground">
            {empty ?? "暂无数据"}
          </div>
        ) : (
          <div className="relative" style={{ height: totalHeight }}>
            {items.slice(startIndex, endIndex).map((item, offset) => {
              const index = startIndex + offset;
              return (
                <div
                  className="absolute left-0 right-0 top-0"
                  key={index}
                  style={{
                    height: safeHeight,
                    transform: `translateY(${index * safeHeight}px)`,
                  }}
                >
                  {renderRow(item, index)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppScrollbar>
  );
}

function SurfaceHeader({
  className,
  columns,
}: {
  className: string;
  columns: Array<{
    content: React.ReactNode;
    side?: "left" | "right";
  }>;
}) {
  return (
    <div className={cn("grid rounded-t-[1.25rem] border border-border/80 bg-card", className)}>
      {columns.map((column, index) => {
        const cell = (
          <div className="border-b border-border/80 px-4 py-3 text-sm font-medium text-muted-foreground">{column.content}</div>
        );

        if (!column.side) {
          return <div key={index}>{cell}</div>;
        }

        return (
          <StickyCell className={index === 0 ? "rounded-tl-[1.25rem]" : index === columns.length - 1 ? "rounded-tr-[1.25rem]" : ""} key={index} side={column.side}>
            {cell}
          </StickyCell>
        );
      })}
    </div>
  );
}

function renderWorkbenchColumn(column: WorkbenchColumnKey, row: WorkbenchRow) {
  switch (column) {
    case "owner":
      return (
        <div className="grid min-w-[132px] gap-1">
          <span className="font-medium text-foreground">{row.owner}</span>
          <span className="text-xs text-muted-foreground">{row.region} / {row.channel}</span>
        </div>
      );
    case "journey":
      return (
        <div className="flex min-w-[180px] flex-wrap gap-2">
          <Badge size="small" tone={getPaymentTone(row.paymentStatus)}>
            {row.paymentStatus}
          </Badge>
          <Badge size="small" tone={getFulfillmentTone(row.fulfillmentStatus)}>
            {row.fulfillmentStatus}
          </Badge>
        </div>
      );
    case "amount":
      return (
        <div className="grid min-w-[140px] gap-1">
          <span className="font-medium text-foreground">{formatAmount(row.amount)}</span>
          <span className="text-xs text-muted-foreground">{row.segment}</span>
        </div>
      );
    case "source":
      return (
        <div className="grid min-w-[146px] gap-1">
          <span className="font-medium text-foreground">{row.source}</span>
          <span className="text-xs text-muted-foreground">{row.contact}</span>
        </div>
      );
    case "tags":
      return (
        <div className="flex min-w-[170px] flex-wrap gap-2">
          {row.tags.map((tag) => (
            <Badge key={tag} size="small" tone="muted">
              {tag}
            </Badge>
          ))}
        </div>
      );
    case "followUp":
      return (
        <div className="grid min-w-[170px] gap-1">
          <span className="font-medium text-foreground">{row.nextAction}</span>
          <span className="text-xs text-muted-foreground">最近跟进 {row.lastTouch}</span>
        </div>
      );
    case "risk":
      return (
        <div className="grid min-w-[120px] gap-1">
          <Badge className="w-fit" size="small" tone={getRiskTone(row.riskLevel)}>
            {row.riskLevel}
          </Badge>
          <span className="text-xs text-muted-foreground">{row.region} / {row.source}</span>
        </div>
      );
    case "updated":
      return (
        <div className="grid min-w-[110px] gap-1">
          <span className="font-medium text-foreground">{row.updatedAt}</span>
          <span className="text-xs text-muted-foreground">最后动作 {row.lastTouch}</span>
        </div>
      );
    default:
      return null;
  }
}

function getWorkbenchColumnLabel(column: WorkbenchColumnKey) {
  switch (column) {
    case "owner":
      return "负责人";
    case "journey":
      return "履约进度";
    case "amount":
      return "金额 / 客群";
    case "source":
      return "来源 / 联系";
    case "tags":
      return "标签";
    case "followUp":
      return "下一步动作";
    case "risk":
      return "风险";
    case "updated":
      return "最近更新";
    default:
      return "";
  }
}

export function WorkbenchWideTablePattern() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<WorkbenchViewKey>("default");
  const [virtualized, setVirtualized] = useState(true);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return workbenchRows
      .filter(workbenchViewConfig[view].filter)
      .filter((row) => {
        if (!normalized) {
          return true;
        }
        return [row.name, row.code, row.owner, row.region, row.source, row.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      });
  }, [query, view]);

  const columns = workbenchViewConfig[view].columns;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-5">
        <SectionIntro
          description="适合订单、用户、商品、门店这类标准后台列表。把默认视图、筛选条、固定身份列、固定操作列先搭起来，再决定哪些列应该常驻。"
          icon={<Columns3 className="h-5 w-5" />}
          title="方案 A · 工作台宽表"
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-center">
          <PatternTabs
            items={(Object.keys(workbenchViewConfig) as WorkbenchViewKey[]).map((item) => ({
              label: `${workbenchViewConfig[item].label} · ${workbenchRows.filter(workbenchViewConfig[item].filter).length}`,
              value: item,
            }))}
            onValueChange={(next) => setView(next as WorkbenchViewKey)}
            value={view}
          />
          <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
            <Input
              className="min-w-[220px]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索订单、负责人、来源"
              prefix={<Search className="h-4 w-4" />}
              value={query}
            />
            <Button outlined size="small" type="button" variant="default">
              <Filter className="h-4 w-4" />
              更多筛选
            </Button>
            <Button outlined size="small" type="button" variant="default">
              <Settings2 className="h-4 w-4" />
              列设置
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge tone="primary">身份列固定</Badge>
          <Badge tone="muted">操作列固定</Badge>
          <Badge tone={virtualized ? "success" : "warning"}>{virtualized ? "虚拟化开启" : "虚拟化关闭"}</Badge>
          <Badge tone="info">低频字段进视图配置</Badge>
          <span>{workbenchViewConfig[view].description}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">当前共 {visibleRows.length} 条记录</p>
              <p className="text-xs leading-6 text-muted-foreground">第一列用复合单元格承载名称、编号、客群和渠道，避免把这些信息拆成 3 到 4 个散列。</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>默认显示 {columns.length} 个业务列</span>
              <span>·</span>
              <span>长文本不进主表</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button outlined={!virtualized} plain={virtualized} size="small" type="button" variant="default" onClick={() => setVirtualized((current) => !current)}>
            <Activity className="h-4 w-4" />
            {virtualized ? "关闭虚拟化" : "开启虚拟化"}
          </Button>
        </div>

        <VirtualizedSurface
          estimatedRowHeight={76}
          header={
            <SurfaceHeader
              className={`min-w-[1180px] grid-cols-[280px_${columns.map(() => "minmax(120px,1fr)").join("_")}_156px]`}
              columns={[
                {
                  content: (
                    <div className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">身份列</span>
                      <span className="text-sm font-medium text-foreground">订单 / 客户</span>
                    </div>
                  ),
                  side: "left",
                },
                ...columns.map((column) => ({ content: getWorkbenchColumnLabel(column) })),
                { content: "状态 / 操作", side: "right" },
              ]}
            />
          }
          items={visibleRows}
          maxHeightClassName={virtualized ? "max-h-[28rem]" : "max-h-[200rem]"}
          minWidthClassName={`min-w-[1180px] ${!virtualized ? "pb-2" : ""}`}
          overscan={virtualized ? 5 : visibleRows.length}
          renderRow={(row) => (
            <div className={`group grid h-full border-x border-b border-border/80 bg-card hover:bg-secondary/50 grid-cols-[280px_${columns.map(() => "minmax(120px,1fr)").join("_")}_156px]`}>
              <StickyCell className="px-4 py-3" side="left">
                <div className="grid min-w-[248px] gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{row.name}</span>
                    <Badge size="small" tone="primary">
                      {row.segment}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{row.code}</span>
                    <span>{row.region}</span>
                    <span>{row.channel}</span>
                  </div>
                </div>
              </StickyCell>
              {columns.map((column) => (
                <div className="px-4 py-3 text-sm text-foreground" key={`${row.id}-${column}`}>
                  {renderWorkbenchColumn(column, row)}
                </div>
              ))}
              <StickyCell className="px-4 py-3" side="right">
                <div className="flex min-w-[132px] flex-wrap justify-end gap-2">
                  <Badge size="small" tone={getRiskTone(row.riskLevel)}>
                    {row.riskLevel}
                  </Badge>
                  <Button plain size="small" type="button" variant="default">
                    查看
                  </Button>
                </div>
              </StickyCell>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}

export function DetailSplitTablePattern() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<RecordViewKey>("all");
  const [selectedId, setSelectedId] = useState<string>(detailRecords[0]?.id ?? "");
  const [virtualized, setVirtualized] = useState(true);

  const visibleRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return detailRecords.filter((record) => {
      const matchesView =
        view === "all"
          ? true
          : view === "pending"
            ? record.status === "待处理" || record.status === "待复核"
            : view === "exception"
              ? record.status === "异常"
              : record.status === "已完成";

      if (!matchesView) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      return [record.title, record.summary, record.actor, record.source, record.category]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [query, view]);

  useEffect(() => {
    if (!visibleRecords.length) {
      return;
    }

    if (!visibleRecords.some((item) => item.id === selectedId)) {
      setSelectedId(visibleRecords[0].id);
    }
  }, [selectedId, visibleRecords]);

  const activeRecord = visibleRecords.find((record) => record.id === selectedId) ?? visibleRecords[0] ?? null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-5">
        <SectionIntro
          description="适合日志、工单、审批、任务记录。主表只保留摘要字段，长文本、JSON、上下文和历史全部外移到右侧详情栏。"
          icon={<SplitSquareVertical className="h-5 w-5" />}
          title="方案 B · 列表 + 详情栏"
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-center">
          <PatternTabs
            items={[
              { label: `全部 · ${detailRecords.length}`, value: "all" },
              { label: "待处理", value: "pending" },
              { label: "异常", value: "exception" },
              { label: "已完成", value: "completed" },
            ]}
            onValueChange={(next) => setView(next as RecordViewKey)}
            value={view}
          />
          <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
            <Input
              className="min-w-[220px]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、来源、责任人"
              prefix={<Search className="h-4 w-4" />}
              value={query}
            />
            <Button outlined size="small" type="button" variant="default">
              <Activity className="h-4 w-4" />
              批量筛选
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button outlined={!virtualized} plain={virtualized} size="small" type="button" variant="default" onClick={() => setVirtualized((current) => !current)}>
            <Activity className="h-4 w-4" />
            {virtualized ? "关闭虚拟化" : "开启虚拟化"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <MasterDetailLayout className="items-start xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <ListPane>
            <Card className="h-full border-border/70 bg-secondary/20 shadow-none">
              <CardHeader className="gap-2">
                <CardTitle className="text-base">摘要列表</CardTitle>
                <CardDescription>当前视图只保留标题、状态、责任人、来源和时间，所有重字段交给右侧详情。</CardDescription>
              </CardHeader>
              <CardContent>
                <VirtualizedSurface
                  empty="当前筛选条件下没有摘要记录。"
                  estimatedRowHeight={88}
                  header={
                    <SurfaceHeader
                      className="min-w-[760px] grid-cols-[minmax(280px,2.4fr)_112px_110px_120px_110px]"
                      columns={[
                        { content: "事件" },
                        { content: "状态" },
                        { content: "责任人" },
                        { content: "来源" },
                        { content: "时间" },
                      ]}
                    />
                  }
                  items={visibleRecords}
                  maxHeightClassName={virtualized ? "max-h-[34rem]" : "max-h-[200rem]"}
                  minWidthClassName="min-w-[760px]"
                  overscan={virtualized ? 5 : visibleRecords.length}
                  renderRow={(record) => {
                    const selected = record.id === activeRecord?.id;
                    return (
                      <button
                        className={cn(
                          "grid h-full w-full border-x border-b border-border/80 px-0 text-left transition-colors hover:bg-secondary/60",
                          "grid-cols-[minmax(280px,2.4fr)_112px_110px_120px_110px]",
                          selected && "bg-primary/6 hover:bg-primary/8",
                        )}
                        data-record-id={record.id}
                        onClick={() => setSelectedId(record.id)}
                        type="button"
                      >
                        <div className="grid gap-1 px-4 py-3">
                          <span className="font-medium text-foreground">{record.title}</span>
                          <span className="line-clamp-2 text-xs leading-6 text-muted-foreground">{record.summary}</span>
                        </div>
                        <div className="px-4 py-3">
                          <Badge size="small" tone={getRecordStatusTone(record.status)}>
                            {record.status}
                          </Badge>
                        </div>
                        <div className="px-4 py-3 text-sm text-foreground">{record.actor}</div>
                        <div className="px-4 py-3 text-sm text-foreground">{record.source}</div>
                        <div className="px-4 py-3 text-sm text-foreground">{record.createdAt}</div>
                      </button>
                    );
                  }}
                />
              </CardContent>
            </Card>
          </ListPane>

          <DetailPane>
            <Card className="h-full border-border/70 shadow-none">
              <CardHeader className="gap-3">
                {activeRecord ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={getRecordStatusTone(activeRecord.status)}>{activeRecord.status}</Badge>
                      <Badge tone="muted">{activeRecord.category}</Badge>
                      <Badge tone="info">{activeRecord.priority}</Badge>
                    </div>
                    <div className="space-y-1">
                      <CardTitle>{activeRecord.title}</CardTitle>
                      <CardDescription>{activeRecord.summary}</CardDescription>
                    </div>
                  </>
                ) : (
                  <>
                    <CardTitle>暂无数据</CardTitle>
                    <CardDescription>当前筛选条件下没有记录。</CardDescription>
                  </>
                )}
              </CardHeader>
              <CardContent>
                {activeRecord ? (
                  <AppScrollbar className="max-h-[34rem]" viewportClassName="pr-1">
                    <div className="grid gap-4 pr-1">
                      <DetailGrid
                        items={[
                          { label: "责任人", value: activeRecord.actor },
                          { label: "来源", value: activeRecord.source },
                          { label: "结果", value: activeRecord.result },
                          { label: "时间", value: activeRecord.createdAt },
                        ]}
                      />
                      <Card className="border-border/70 bg-secondary/20 shadow-none">
                        <CardHeader>
                          <CardTitle className="text-base">处理备注</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm leading-7 text-muted-foreground">{activeRecord.note}</CardContent>
                      </Card>
                      <Card className="border-border/70 bg-secondary/20 shadow-none">
                        <CardHeader>
                          <CardTitle className="text-base">处理时间线</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2">
                          {activeRecord.timeline.map((item) => (
                            <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground" key={item}>
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                      <ReadonlyCodeBlock title="原始负载">{activeRecord.payload}</ReadonlyCodeBlock>
                    </div>
                  </AppScrollbar>
                ) : (
                  <div className="text-sm text-muted-foreground">请调整筛选条件后重试。</div>
                )}
              </CardContent>
            </Card>
          </DetailPane>
        </MasterDetailLayout>
      </CardContent>
    </Card>
  );
}

export function GroupedMetricTablePattern() {
  const [dimension, setDimension] = useState<GroupDimensionKey>("region");
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const [virtualized, setVirtualized] = useState(true);

  const groupedRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = groupMetricRows.filter((row) => {
      if (!normalized) {
        return true;
      }

      return [row.storeName, row.storeCode, row.manager, row.region, row.phase, row.channel]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });

    const groups = new Map<string, GroupMetricRow[]>();
    filtered.forEach((row) => {
      const key = dimension === "region" ? row.region : row.phase;
      const current = groups.get(key) ?? [];
      current.push(row);
      groups.set(key, current);
    });

    return Array.from(groups.entries()).map(([groupName, rows]) => ({
      groupName,
      rows,
      summary: {
        highRisk: rows.filter((row) => row.phase === "风险关注").length,
        pending: rows.reduce((accumulator, row) => accumulator + row.pending, 0),
        stores: rows.length,
      },
    }));
  }, [dimension, query]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-5">
        <SectionIntro
          description="适合盘点、履约看板、区域经营表。先分组，再在组内横向比指标，用户看到的是有语义的板块，不是一张无边界的大表。"
          icon={<FolderKanban className="h-5 w-5" />}
          title="方案 C · 分组宽表"
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-center">
          <PatternTabs
            items={[
              { label: "按区域分组", value: "region" },
              { label: "按经营阶段分组", value: "phase" },
            ]}
            onValueChange={(next) => setDimension(next as GroupDimensionKey)}
            value={dimension}
          />
          <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
            <Input
              className="min-w-[220px]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索门店、区域、负责人"
              prefix={<Search className="h-4 w-4" />}
              value={query}
            />
            <Button
              outlined={!compact}
              plain={compact}
              size="small"
              type="button"
              variant="default"
              onClick={() => setCompact((current) => !current)}
            >
              <ArrowUpRight className="h-4 w-4" />
              {compact ? "舒展密度" : "紧凑密度"}
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button outlined={!virtualized} plain={virtualized} size="small" type="button" variant="default" onClick={() => setVirtualized((current) => !current)}>
            <Activity className="h-4 w-4" />
            {virtualized ? "关闭虚拟化" : "开启虚拟化"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {groupedRows.map((group) => (
          <Card className="border-border/70 bg-secondary/20 shadow-none" key={group.groupName}>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">{group.groupName}</CardTitle>
                  <CardDescription>
                    {dimension === "region" ? "区域内门店按经营健康度排序。" : "同阶段门店放在一起横向比指标。"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="muted">门店 {group.summary.stores}</Badge>
                  <Badge tone="warning">待处理 {group.summary.pending}</Badge>
                  <Badge tone={group.summary.highRisk > 0 ? "danger" : "success"}>高风险 {group.summary.highRisk}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VirtualizedSurface
                estimatedRowHeight={compact ? 68 : 84}
                header={
                  <SurfaceHeader
                    className="min-w-[1180px] grid-cols-[260px_110px_120px_96px_96px_96px_96px_96px_104px_220px]"
                    columns={[
                      { content: "门店 / 编号", side: "left" },
                      { content: "负责人" },
                      { content: "经营阶段" },
                      { content: "订单量" },
                      { content: "待处理" },
                      { content: "履约率" },
                      { content: "退款率" },
                      { content: "毛利率" },
                      { content: "老库存" },
                      { content: "下一步动作", side: "right" },
                    ]}
                  />
                }
                items={group.rows}
                maxHeightClassName={virtualized ? "max-h-[24rem]" : "max-h-[200rem]"}
                minWidthClassName="min-w-[1180px]"
                overscan={virtualized ? 4 : group.rows.length}
                renderRow={(row) => (
                  <div className="group grid h-full border-x border-b border-border/80 bg-card hover:bg-secondary/50 grid-cols-[260px_110px_120px_96px_96px_96px_96px_96px_104px_220px]">
                    <StickyCell className={cn("px-4", compact ? "py-2" : "py-3")} side="left">
                      <div className="grid min-w-[228px] gap-1">
                        <span className="font-medium text-foreground">{row.storeName}</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{row.storeCode}</span>
                          <span>{row.channel}</span>
                          <span>{row.region}</span>
                        </div>
                      </div>
                    </StickyCell>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.manager}</div>
                    <div className={cn("px-4", compact ? "py-2" : "py-3")}>
                      <Badge size="small" tone={getPhaseTone(row.phase)}>
                        {row.phase}
                      </Badge>
                    </div>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.orders}</div>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.pending}</div>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.fulfilRate}%</div>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.refundRate}%</div>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.grossMargin}%</div>
                    <div className={cn("px-4 text-sm text-foreground", compact ? "py-2" : "py-3")}>{row.agedStock} 件</div>
                    <StickyCell className={cn("px-4", compact ? "py-2" : "py-3")} side="right">
                      <div className="grid min-w-[180px] gap-1">
                        <span className="font-medium text-foreground">{row.followUp}</span>
                        <span className="text-xs text-muted-foreground">建议把动作保留在最后一列，不要把说明文字拆成独立散列。</span>
                      </div>
                    </StickyCell>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

export function WideTablePatternGallery() {
  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden border-primary/14 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),transparent_48%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))]">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">竞品翻译成组件</Badge>
            <Badge tone="muted">Airtable / Shopify / Jira / Notion / ClickUp</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle>宽表方案组件集</CardTitle>
            <CardDescription>
              这组组件不是在做表格库能力展示，而是在实现三种更接近真实产品的后台骨架：工作台宽表、列表 + 详情栏、分组宽表。你可以直接拿这些骨架去替换现有页面。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">先做视图，再做列</span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">身份列优先，不做字段平权</span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1">重字段外移，不塞主表</span>
          </div>
        </CardHeader>
      </Card>

      <WorkbenchWideTablePattern />
      <DetailSplitTablePattern />
      <GroupedMetricTablePattern />
    </div>
  );
}
