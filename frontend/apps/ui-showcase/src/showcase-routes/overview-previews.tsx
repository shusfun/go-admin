import type { ReactNode } from "react";

export type PreviewKind =
  | "button"
  | "badge"
  | "breadcrumb"
  | "status"
  | "theme"
  | "input"
  | "calendar"
  | "choice"
  | "upload"
  | "form"
  | "notice"
  | "empty"
  | "skeleton"
  | "toast"
  | "dialog"
  | "popover"
  | "table"
  | "pagination"
  | "tabs"
  | "progress"
  | "avatar"
  | "icon"
  | "log"
  | "metric"
  | "layout"
  | "watermark"
  | "steps"
  | "loading"
  | "tree"
  | "auth"
  | "brand";

const PREVIEW_FILTERS = {
  blueMedium: "drop-shadow(0 8px 16px rgba(37, 99, 235, 0.18))",
  slateSmallStrong: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.10))",
  slateSmall: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.08))",
  slateSmallSoft: "drop-shadow(0 6px 12px rgba(15, 23, 42, 0.06))",
  focusBlue: "drop-shadow(0 6px 12px rgba(59, 130, 246, 0.12))",
  slateMediumStrong: "drop-shadow(0 8px 16px rgba(15, 23, 42, 0.10))",
  slateMedium: "drop-shadow(0 8px 16px rgba(15, 23, 42, 0.08))",
  slateFloatStrong: "drop-shadow(0 8px 18px rgba(15, 23, 42, 0.14))",
  slateFloat: "drop-shadow(0 8px 18px rgba(15, 23, 42, 0.10))",
  slateFloatSoft: "drop-shadow(0 8px 18px rgba(15, 23, 42, 0.08))",
  slateLargeStrong: "drop-shadow(0 12px 20px rgba(15, 23, 42, 0.18))",
  slateLarge: "drop-shadow(0 10px 20px rgba(15, 23, 42, 0.14))",
  slateLargeSoft: "drop-shadow(0 10px 20px rgba(15, 23, 42, 0.10))",
  blueLarge: "drop-shadow(0 10px 20px rgba(37, 99, 235, 0.16))",
} as const;

function Frame({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={[
        "flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border px-4 py-3",
        dark
          ? "border-slate-800 bg-slate-950 text-slate-100"
          : "border-border/70 bg-card/80 text-foreground",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function Panel({ x, y, w, h, fill = "#f8fbff", stroke = "#d8e4ef", r = 16 }: { x: number; y: number; w: number; h: number; fill?: string; stroke?: string; r?: number }) {
  return <rect fill={fill} height={h} rx={r} stroke={stroke} strokeWidth="1" width={w} x={x} y={y} />;
}

function Bar({ x, y, w, h = 6, fill = "#c4d2df", r = 3 }: { x: number; y: number; w: number; h?: number; fill?: string; r?: number }) {
  return <rect fill={fill} height={h} rx={r} width={w} x={x} y={y} />;
}

function Pill({ x, y, w, label, fill, stroke, color }: { x: number; y: number; w: number; label: string; fill: string; stroke: string; color: string }) {
  return (
    <>
      <rect fill={fill} height="20" rx="10" stroke={stroke} width={w} x={x} y={y} />
      <text fill={color} fontFamily="ui-sans-serif,system-ui" fontSize="10" fontWeight="600" textAnchor="middle" x={x + w / 2} y={y + 13}>{label}</text>
    </>
  );
}

function PreviewText({
  x,
  y,
  children,
  fill = "#64748b",
  size = 10,
  weight = 600,
  anchor = "start",
}: {
  x: number;
  y: number;
  children: ReactNode;
  fill?: string;
  size?: number;
  weight?: number | string;
  anchor?: "start" | "middle" | "end";
}) {
  return (
    <text fill={fill} fontFamily="ui-sans-serif,system-ui" fontSize={size} fontWeight={weight} textAnchor={anchor} x={x} y={y}>
      {children}
    </text>
  );
}

function Dot({ cx, cy, r = 4, fill }: { cx: number; cy: number; r?: number; fill: string }) {
  return <circle cx={cx} cy={cy} fill={fill} r={r} />;
}

function Canvas({ kind }: { kind: PreviewKind }) {
  const dark = kind === "log";
  return (
    <Frame dark={dark}>
      <svg aria-hidden className="h-full w-full" viewBox="0 0 240 160">
        {kind === "button" && (
          <>
            <rect fill="#dbeafe" height="42" rx="16" width="118" x="61" y="52" />
            <g style={{ filter: PREVIEW_FILTERS.blueMedium }}>
              <rect fill="#409eff" height="34" rx="10" width="96" x="72" y="56" />
              <circle cx="92" cy="73" fill="rgba(255,255,255,0.88)" r="4" />
              <PreviewText anchor="middle" fill="#fff" size={12} weight={700} x={126} y={76}>Action</PreviewText>
            </g>
            <rect fill="#fff" height="24" rx="8" stroke="#bfd7ff" width="64" x="88" y="98" />
            <PreviewText anchor="middle" fill="#4b8dff" size={10} weight={700} x={120} y={113}>Default</PreviewText>
          </>
        )}
        {kind === "badge" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateSmallStrong }}>
              <rect fill="#fff" height="28" rx="10" stroke="#dbe4f0" width="62" x="44" y="56" />
              <PreviewText anchor="middle" fill="#475569" size={11} weight={700} x={75} y={73}>消息</PreviewText>
              <circle cx="102" cy="52" fill="#f56c6c" r="8" />
              <PreviewText anchor="middle" fill="#fff" size={9} weight={700} x={102} y={55}>2</PreviewText>
            </g>
            <g style={{ filter: PREVIEW_FILTERS.slateSmallStrong }}>
              <rect fill="#fff" height="28" rx="10" stroke="#dbe4f0" width="70" x="124" y="56" />
              <PreviewText anchor="middle" fill="#475569" size={11} weight={700} x={159} y={73}>任务</PreviewText>
              <rect fill="#67c23a" height="18" rx="9" width="18" x="180" y="50" />
              <path d="M185 59.5l3 3 6-7" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </g>
            <g style={{ filter: PREVIEW_FILTERS.slateSmallStrong }}>
              <rect fill="#fff8eb" height="24" rx="9" stroke="#f3d9a8" width="72" x="84" y="100" />
              <PreviewText anchor="middle" fill="#d97706" size={10} weight={700} x={120} y={115}>Beta</PreviewText>
            </g>
          </>
        )}
        {kind === "breadcrumb" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateSmall }}>
              <rect fill="#fff" height="42" rx="12" stroke="#dbe4f0" width="162" x="39" y="55" />
            </g>
            <PreviewText fill="#64748b" size={11} weight={600} x={56} y={81}>首页</PreviewText>
            <path d="M87 71l6 5-6 5" fill="none" stroke="#b2bdc9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <PreviewText fill="#64748b" size={11} weight={600} x={104} y={81}>组件</PreviewText>
            <path d="M141 71l6 5-6 5" fill="none" stroke="#b2bdc9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <PreviewText fill="#1f2937" size={11} weight={700} x={158} y={81}>Breadcrumb</PreviewText>
          </>
        )}
        {kind === "status" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateSmall }}>
              <rect fill="#fff" height="82" rx="14" stroke="#dbe4f0" width="162" x="39" y="39" />
            </g>
            <line stroke="#e5edf5" x1="52" x2="188" y1="81" y2="81" />
            <Dot cx={55} cy={60} fill="#22c55e" />
            <PreviewText fill="#475569" size={11} weight={700} x={66} y={64}>deploy-job</PreviewText>
            <Pill color="#16a34a" fill="#eefbf6" label="成功" stroke="#bcead5" w={36} x={156} y={49} />
            <Dot cx={55} cy={98} fill="#f59e0b" />
            <PreviewText fill="#475569" size={11} weight={700} x={66} y={102}>sync-task</PreviewText>
            <Pill color="#d97706" fill="#fff8eb" label="重试中" stroke="#f3d18e" w={48} x={144} y={87} />
          </>
        )}
        {kind === "theme" && (
          <>
            <rect fill="#dbeafe" height="48" rx="24" width="116" x="62" y="52" />
            <circle cx="92" cy="76" fill="#fbbf24" r="10" />
            <circle cx="148" cy="76" fill="#0f172a" r="18" />
            <path d="M146 66a10 10 0 1 0 10 10 9 9 0 0 1-10-10Z" fill="none" stroke="#cbd5e1" strokeWidth="2" />
          </>
        )}
        {kind === "input" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.focusBlue }}>
              <rect fill="#fff" height="34" rx="10" stroke="#9cc5ff" strokeWidth="1.4" width="164" x="38" y="38" />
              <circle cx="56" cy="55" fill="none" r="5" stroke="#8aa4c1" strokeWidth="1.6" />
              <line stroke="#8aa4c1" strokeLinecap="round" strokeWidth="1.6" x1="59.5" x2="64.5" y1="58.5" y2="63.5" />
              <PreviewText fill="#94a3b8" size={11} weight={600} x={70} y={59}>搜索组件</PreviewText>
            </g>
            <g style={{ filter: PREVIEW_FILTERS.slateSmall }}>
              <rect fill="#fff" height="34" rx="10" stroke="#dbe4f0" width="164" x="38" y="84" />
              <PreviewText fill="#64748b" size={11} weight={700} x={54} y={105}>状态</PreviewText>
              <rect fill="#eef6ff" height="20" rx="10" stroke="#cfe2ff" width="44" x="122" y="91" />
              <PreviewText anchor="middle" fill="#409eff" size={10} weight={700} x={144} y={104}>启用</PreviewText>
              <path d="M178 97l6 6 6-6" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </g>
          </>
        )}
        {kind === "calendar" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateMediumStrong }}>
              <rect fill="#fff" height="112" rx="16" stroke="#dbe4f0" width="132" x="54" y="24" />
              <rect fill="#f8fbff" height="24" rx="16" width="132" x="54" y="24" />
              <PreviewText fill="#334155" size={11} weight={700} x={70} y={40}>April</PreviewText>
              <circle cx="163" cy="36" fill="#409eff" r="4" />
              <circle cx="175" cy="36" fill="#dbe4f0" r="4" />
            </g>
            {Array.from({ length: 7 }, (_, index) => <Bar fill="#c9d7e5" h={4} key={`week-${index}`} w={10} x={65 + index * 16} y={56} />)}
            {Array.from({ length: 28 }, (_, index) => {
              const selected = index === 8 || index === 17 || index === 18;
              return <rect fill={selected ? "#409eff" : "#edf3f8"} height="12" key={`day-${index}`} rx="4" width="12" x={65 + (index % 7) * 16} y={68 + Math.floor(index / 7) * 15} />;
            })}
          </>
        )}
        {kind === "choice" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateMedium }}>
              <rect fill="#fff" height="92" rx="16" stroke="#dbe4f0" width="148" x="46" y="34" />
            </g>
            <rect fill="#409eff" height="16" rx="5" width="16" x="60" y="50" />
            <path d="M64 58l3 3 6-7" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <PreviewText fill="#475569" size={11} weight={700} x={86} y={62}>Checkbox</PreviewText>
            <circle cx="68" cy="86" fill="#fff" r="8" stroke="#409eff" strokeWidth="2" />
            <circle cx="68" cy="86" fill="#409eff" r="3.5" />
            <PreviewText fill="#475569" size={11} weight={700} x={86} y={90}>RadioGroup</PreviewText>
            <rect fill="#409eff" height="18" rx="9" width="34" x="52" y="105" />
            <circle cx="77" cy="114" fill="#fff" r="7" />
            <PreviewText fill="#475569" size={11} weight={700} x={98} y={118}>Switch</PreviewText>
          </>
        )}
        {kind === "upload" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateMedium }}>
              <rect fill="#fff" height="56" rx="14" stroke="#b7d7ff" strokeDasharray="5 5" width="156" x="42" y="24" />
            </g>
            <path d="M120 40v18m0-18-8 8m8-8 8 8" fill="none" stroke="#409eff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
            <PreviewText anchor="middle" fill="#409eff" size={11} weight={700} x={120} y={68}>点击上传</PreviewText>
            <g style={{ filter: PREVIEW_FILTERS.slateSmall }}>
              <rect fill="#fff" height="24" rx="10" stroke="#dbe4f0" width="124" x="58" y="96" />
              <rect fill="#eef6ff" height="14" rx="7" stroke="#cfe2ff" width="28" x="66" y="101" />
              <PreviewText anchor="middle" fill="#409eff" size={9} weight={700} x={80} y={111}>PNG</PreviewText>
              <Bar fill="#b7c6d8" h={5} w={44} x={104} y={106} />
              <circle cx="167" cy="108" fill="#22c55e" r="4" />
            </g>
          </>
        )}
        {kind === "form" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateMedium }}>
              <rect fill="#fff" height="118" rx="16" stroke="#dbe4f0" width="144" x="48" y="20" />
            </g>
            <PreviewText fill="#64748b" size={10} weight={700} x={62} y={39}>名称</PreviewText>
            <rect fill="#fff" height="24" rx="8" stroke="#dbe4f0" width="116" x="62" y="46" />
            <Bar fill="#d0dbe6" w={52} x={72} y={56} />
            <PreviewText fill="#64748b" size={10} weight={700} x={62} y={86}>描述</PreviewText>
            <rect fill="#fff" height="24" rx="8" stroke="#dbe4f0" width="116" x="62" y="93" />
            <Bar fill="#d0dbe6" w={68} x={72} y={103} />
            <rect fill="#409eff" height="22" rx="8" width="54" x="124" y="122" />
            <PreviewText anchor="middle" fill="#fff" size={10} weight={700} x={151} y={136}>提交</PreviewText>
          </>
        )}
        {kind === "notice" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateSmallSoft }}>
              <rect fill="#ecf5ff" height="28" rx="10" stroke="#cfe2ff" width="164" x="38" y="44" />
              <circle cx="56" cy="58" fill="#409eff" r="6" />
              <PreviewText anchor="middle" fill="#fff" size={9} weight={700} x={56} y={61}>i</PreviewText>
              <PreviewText fill="#2563eb" size={11} weight={700} x={70} y={62}>同步完成</PreviewText>
              <path d="M184 52l8 8m0-8-8 8" fill="none" stroke="#7eaee9" strokeLinecap="round" strokeWidth="1.7" />
            </g>
            <g style={{ filter: PREVIEW_FILTERS.slateSmallSoft }}>
              <rect fill="#fff8eb" height="28" rx="10" stroke="#f3deae" width="164" x="38" y="88" />
              <circle cx="56" cy="102" fill="#f59e0b" r="6" />
              <PreviewText anchor="middle" fill="#fff" size={9} weight={700} x={56} y={105}>!</PreviewText>
              <PreviewText fill="#b45309" size={11} weight={700} x={70} y={106}>请检查字段配置</PreviewText>
            </g>
          </>
        )}
        {kind === "empty" && (
          <>
            <circle cx="120" cy="60" fill="#e8f3ff" r="24" />
            <path d="M101 67h38l-4 24h-30Z" fill="#fff" stroke="#b9d5f6" strokeLinejoin="round" strokeWidth="1.5" />
            <path d="M111 56h18l4 11h-26Z" fill="#eff6ff" stroke="#b9d5f6" strokeLinejoin="round" strokeWidth="1.5" />
            <Bar fill="#b8c6d6" h={7} w={52} x={94} y={102} />
            <Bar fill="#d1dbe6" h={6} w={34} x={103} y={114} />
          </>
        )}
        {kind === "skeleton" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateMedium }}>
              <rect fill="#fff" height="92" rx="16" stroke="#dbe4f0" width="148" x="46" y="34" />
            </g>
            <circle cx="68" cy="62" fill="#edf3f8" r="12" />
            <rect fill="#edf3f8" height="10" rx="5" width="86" x="88" y="52" />
            <rect fill="#edf3f8" height="8" rx="4" width="62" x="88" y="68" />
            <rect fill="#edf3f8" height="8" rx="4" width="112" x="60" y="94" />
            <rect fill="#edf3f8" height="8" rx="4" width="98" x="60" y="108" />
          </>
        )}
        {kind === "toast" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloatStrong }}>
              <rect fill="#fff" height="36" rx="10" stroke="#dbe4f0" width="114" x="96" y="30" />
              <circle cx="114" cy="48" fill="#22c55e" r="7" />
              <path d="M111 48l2 2 4-5" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
              <PreviewText fill="#334155" size={11} weight={700} x={128} y={46}>保存成功</PreviewText>
              <Bar fill="#cbd5e1" h={4} w={42} x={128} y={52} />
            </g>
            <g style={{ filter: PREVIEW_FILTERS.slateFloat }}>
              <rect fill="#fff" height="36" rx="10" stroke="#dbe4f0" width="114" x="66" y="84" />
              <circle cx="84" cy="102" fill="#409eff" r="7" />
              <PreviewText anchor="middle" fill="#fff" size={9} weight={700} x={84} y={105}>i</PreviewText>
              <PreviewText fill="#334155" size={11} weight={700} x={98} y={100}>新消息</PreviewText>
              <Bar fill="#cbd5e1" h={4} w={48} x={98} y={106} />
            </g>
          </>
        )}
        {kind === "dialog" && (
          <>
            <rect fill="rgba(15,23,42,0.10)" height="126" rx="20" width="188" x="26" y="17" />
            <g style={{ filter: PREVIEW_FILTERS.slateLargeStrong }}>
              <rect fill="#fff" height="94" rx="16" stroke="#dbe4f0" width="128" x="56" y="34" />
            </g>
            <PreviewText fill="#334155" size={12} weight={700} x={72} y={54}>确认操作</PreviewText>
            <path d="M165 46l8 8m0-8-8 8" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeWidth="1.7" />
            <Bar fill="#c7d3df" h={6} w={74} x={72} y={70} />
            <Bar fill="#d8e2ec" h={6} w={58} x={72} y={82} />
            <rect fill="#f3f6f9" height="22" rx="8" width="42" x="98" y="100" />
            <rect fill="#409eff" height="22" rx="8" width="46" x="146" y="100" />
          </>
        )}
        {kind === "popover" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateSmall }}>
              <rect fill="#fff" height="28" rx="8" stroke="#dbe4f0" width="60" x="40" y="64" />
              <PreviewText anchor="middle" fill="#409eff" size={10} weight={700} x={70} y={82}>更多</PreviewText>
            </g>
            <g style={{ filter: PREVIEW_FILTERS.slateLarge }}>
              <path d="M135 45l8 8h-16Z" fill="#fff" stroke="#dbe4f0" strokeLinejoin="round" />
              <rect fill="#fff" height="64" rx="12" stroke="#dbe4f0" width="92" x="118" y="52" />
              <Bar fill="#94a3b8" h={5} w={42} x={134} y={68} />
              <line stroke="#ebf0f5" x1="132" x2="196" y1="81" y2="81" />
              <Bar fill="#c5d1dc" h={5} w={52} x={134} y={92} />
              <Bar fill="#c5d1dc" h={5} w={36} x={134} y={104} />
            </g>
          </>
        )}
        {kind === "table" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloat }}>
              <rect fill="#fff" height="108" rx="16" stroke="#dbe4f0" width="188" x="26" y="24" />
            </g>
            <Bar fill="#b7c4d1" h={6} w={46} x={40} y={42} />
            <rect fill="#ecf5ff" height="18" rx="9" stroke="#cfe2ff" width="42" x="160" y="35" />
            <PreviewText anchor="middle" fill="#409eff" size={9} weight={700} x={181} y={47}>筛选</PreviewText>
            <rect fill="#f8fbff" height="18" width="188" x="26" y="58" />
            <Bar fill="#93a4b6" h={5} w={24} x={40} y={65} />
            <Bar fill="#93a4b6" h={5} w={30} x={94} y={65} />
            <Bar fill="#93a4b6" h={5} w={26} x={152} y={65} />
            {Array.from({ length: 3 }, (_, index) => (
              <g key={`row-${index}`}>
                <line stroke="#edf2f7" x1="38" x2="202" y1={86 + index * 15} y2={86 + index * 15} />
                <Bar fill="#c5d1dc" h={5} w={30} x={40} y={78 + index * 15} />
                <Bar fill="#d2dbe4" h={5} w={40} x={92} y={78 + index * 15} />
                {index === 1 ? <rect fill="#eefbf6" height="14" rx="7" stroke="#bcead5" width="28" x="164" y={72 + index * 15} /> : <rect fill="#fff8eb" height="14" rx="7" stroke="#f3d18e" width="28" x="164" y={72 + index * 15} />}
              </g>
            ))}
          </>
        )}
        {kind === "pagination" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloatSoft }}>
              <rect fill="#fff" height="48" rx="14" stroke="#dbe4f0" width="158" x="41" y="56" />
            </g>
            <rect fill="#fff" height="24" rx="8" stroke="#dbe4f0" width="24" x="56" y="68" />
            <path d="M70 74l-6 6 6 6" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            {[0, 1, 2].map((index) => (
              <g key={`page-${index}`}>
                <rect fill={index === 0 ? "#409eff" : "#fff"} height="24" rx="8" stroke={index === 0 ? "#409eff" : "#dbe4f0"} width="24" x={92 + index * 30} y="68" />
                <PreviewText anchor="middle" fill={index === 0 ? "#fff" : "#64748b"} size={10} weight={700} x={104 + index * 30} y={84}>{index + 1}</PreviewText>
              </g>
            ))}
            <rect fill="#fff" height="24" rx="8" stroke="#dbe4f0" width="24" x="176" y="68" />
            <path d="M184 74l6 6-6 6" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </>
        )}
        {kind === "tabs" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloatSoft }}>
              <rect fill="#fff" height="98" rx="16" stroke="#dbe4f0" width="164" x="38" y="28" />
            </g>
            <rect fill="#f8fbff" height="24" width="164" x="38" y="28" />
            <PreviewText fill="#409eff" size={11} weight={700} x={54} y={45}>概览</PreviewText>
            <PreviewText fill="#94a3b8" size={11} weight={700} x={98} y={45}>配置</PreviewText>
            <PreviewText fill="#94a3b8" size={11} weight={700} x={142} y={45}>日志</PreviewText>
            <rect fill="#409eff" height="3" rx="1.5" width="26" x="54" y="49" />
            <Bar fill="#b7c4d1" h={6} w={58} x={54} y={74} />
            <Bar fill="#d0dbe6" h={6} w={92} x={54} y={88} />
            <Bar fill="#d0dbe6" h={6} w={74} x={54} y={102} />
          </>
        )}
        {kind === "progress" && (
          <>
            <PreviewText fill="#64748b" size={11} weight={700} x={40} y={54}>发布进度</PreviewText>
            <rect fill="#e7edf4" height="10" rx="5" width="110" x="40" y="62" />
            <rect fill="#409eff" height="10" rx="5" width="76" x="40" y="62" />
            <PreviewText fill="#64748b" size={11} weight={700} x={40} y={98}>数据同步</PreviewText>
            <rect fill="#e7edf4" height="10" rx="5" width="110" x="40" y="106" />
            <rect fill="#f59e0b" height="10" rx="5" width="58" x="40" y="106" />
            <circle cx="182" cy="86" fill="none" r="24" stroke="#e7edf4" strokeWidth="8" />
            <path d="M182 62a24 24 0 1 1-20.7 11.8" fill="none" stroke="#409eff" strokeLinecap="round" strokeWidth="8" />
            <PreviewText anchor="middle" fill="#334155" size={12} weight={700} x={182} y={90}>68%</PreviewText>
          </>
        )}
        {kind === "avatar" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateSmall }}>
              <circle cx="84" cy="76" fill="#dbeafe" r="20" />
              <circle cx="120" cy="66" fill="#c7f0e0" r="20" />
              <circle cx="156" cy="76" fill="#fde7c2" r="20" />
            </g>
            <PreviewText anchor="middle" fill="#2563eb" size={14} weight={700} x={84} y={81}>A</PreviewText>
            <PreviewText anchor="middle" fill="#15803d" size={14} weight={700} x={120} y={71}>B</PreviewText>
            <PreviewText anchor="middle" fill="#c2410c" size={14} weight={700} x={156} y={81}>C</PreviewText>
            <circle cx="99" cy="92" fill="#22c55e" r="5" stroke="#fff" strokeWidth="2" />
            <circle cx="135" cy="82" fill="#f59e0b" r="5" stroke="#fff" strokeWidth="2" />
            <circle cx="171" cy="92" fill="#94a3b8" r="5" stroke="#fff" strokeWidth="2" />
          </>
        )}
        {kind === "icon" && (
          <>
            {[0, 1, 2, 3].map((index) => {
              const x = 56 + (index % 2) * 60;
              const y = 42 + Math.floor(index / 2) * 38;
              return (
                <g key={`icon-${index}`} style={{ filter: PREVIEW_FILTERS.slateSmall }}>
                  <rect fill="#fff" height="28" rx="10" stroke="#dbe4f0" width="44" x={x} y={y} />
                  {index === 0 && <path d="M78 49c0-6-4-10-8-10s-8 4-8 10v7l-4 4h24l-4-4Z" fill="#409eff" />}
                  {index === 1 && <path d="M132 41l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6-6.8-3.7-6.8 3.7 1.3-7.6-5.5-5.4 7.6-1.1Z" fill="#f59e0b" />}
                  {index === 2 && <path d="M66 92c0-6 4-10 10-10s10 4 10 10-4 10-10 10-10-4-10-10Zm5 0h10" fill="none" stroke="#22c55e" strokeWidth="2" />}
                  {index === 3 && <path d="M136 82a8 8 0 1 0 8 8 8 8 0 0 0-8-8Zm0-6v5m0 14v5m11-11h-5m-14 0h-5m15.5-7.5-3.5 3.5m-8 8-3.5 3.5m0-15 3.5 3.5m8 8 3.5 3.5" fill="none" stroke="#64748b" strokeLinecap="round" strokeWidth="1.8" />}
                </g>
              );
            })}
          </>
        )}
        {kind === "log" && (
          <>
            <Panel fill="#18212f" h={110} stroke="#243245" w={176} x={32} y={24} />
            <Dot cx={48} cy={40} fill="#ef4444" r={3} />
            <Dot cx={58} cy={40} fill="#f59e0b" r={3} />
            <Dot cx={68} cy={40} fill="#22c55e" r={3} />
            <PreviewText fill="#7ea0c4" size={10} weight={700} x={46} y={62}>$ tail -f deploy.log</PreviewText>
            <PreviewText fill="#9aa9bb" size={10} weight={600} x={46} y={82}>[12:40:18] build finished</PreviewText>
            <PreviewText fill="#76b8ff" size={10} weight={600} x={46} y={102}>[12:40:21] service restarted</PreviewText>
          </>
        )}
        {kind === "metric" && (
          <>
            {[0, 1, 2, 3].map((index) => {
              const x = 44 + (index % 2) * 76;
              const y = 34 + Math.floor(index / 2) * 44;
              return (
                <g key={`metric-${index}`} style={{ filter: PREVIEW_FILTERS.slateSmallSoft }}>
                  <rect fill="#fff" height="34" rx="12" stroke="#dbe4f0" width="64" x={x} y={y} />
                  <Bar fill="#c4d2df" h={5} w={18} x={x + 10} y={y + 9} />
                  <PreviewText fill="#334155" size={12} weight={700} x={x + 10} y={y + 25}>{["1.8k", "92%", "48", "12m"][index]}</PreviewText>
                </g>
              );
            })}
          </>
        )}
        {kind === "layout" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloat }}>
              <rect fill="#fff" height="112" rx="16" stroke="#dbe4f0" width="188" x="26" y="24" />
            </g>
            <rect fill="#f8fbff" height="16" rx="16" width="188" x="26" y="24" />
            <rect fill="#eef3f8" height="96" width="44" x="26" y="40" />
            <Bar fill="#94a3b8" h={4} w={18} x={38} y={54} />
            <Bar fill="#c7d3df" h={4} w={22} x={38} y={68} />
            <Bar fill="#c7d3df" h={4} w={26} x={38} y={82} />
            <rect fill="#fff" height="24" rx="10" stroke="#dbe4f0" width="118" x="82" y="48" />
            <Bar fill="#b7c4d1" h={5} w={36} x={94} y={58} />
            <rect fill="#f8fbff" height="46" rx="12" stroke="#e5edf5" width="50" x="82" y="82" />
            <rect fill="#f8fbff" height="46" rx="12" stroke="#e5edf5" width="58" x="142" y="82" />
          </>
        )}
        {kind === "watermark" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloat }}>
              <rect fill="#fff" height="112" rx="16" stroke="#dbe4f0" width="188" x="26" y="24" />
            </g>
            <rect fill="#f8fbff" height="16" rx="16" width="188" x="26" y="24" />
            <Bar fill="#b7c4d1" h={5} w={34} x={42} y={55} />
            <Bar fill="#d0dbe6" h={5} w={54} x={42} y={69} />
            <rect fill="#eef6ff" height="40" rx="12" width="132" x="54" y="78" />
            <g opacity="0.58" transform="translate(63 109) rotate(-14)">
              <PreviewText fill="#60a5fa" size={12} weight={700} x={0} y={0}>GO ADMIN UI</PreviewText>
            </g>
            <g opacity="0.32" transform="translate(96 92) rotate(-14)">
              <PreviewText fill="#38bdf8" size={11} weight={700} x={0} y={0}>INTERNAL PREVIEW</PreviewText>
            </g>
          </>
        )}
        {kind === "steps" && (
          <>
            <line stroke="#cfe2ff" strokeWidth="4" x1="66" x2="174" y1="78" y2="78" />
            {[0, 1, 2].map((index) => (
              <g key={`step-${index}`}>
                <circle cx={66 + index * 54} cy="78" fill={index < 2 ? "#409eff" : "#fff"} r="12" stroke="#409eff" strokeWidth="2" />
                <PreviewText anchor="middle" fill={index < 2 ? "#fff" : "#409eff"} size={10} weight={700} x={66 + index * 54} y={82}>{index + 1}</PreviewText>
              </g>
            ))}
            <PreviewText anchor="middle" fill="#64748b" size={10} weight={700} x={66} y={104}>基础</PreviewText>
            <PreviewText anchor="middle" fill="#64748b" size={10} weight={700} x={120} y={104}>配置</PreviewText>
            <PreviewText anchor="middle" fill="#64748b" size={10} weight={700} x={174} y={104}>发布</PreviewText>
          </>
        )}
        {kind === "loading" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloat }}>
              <rect fill="#fff" height="96" rx="16" stroke="#dbe4f0" width="156" x="42" y="32" />
            </g>
            <circle cx="120" cy="66" fill="none" r="14" stroke="#dbeafe" strokeWidth="6" />
            <path d="M120 52a14 14 0 0 1 12 7" fill="none" stroke="#409eff" strokeLinecap="round" strokeWidth="6" />
            <Bar fill="#b7c4d1" h={6} w={56} x={92} y={92} />
            <Bar fill="#d0dbe6" h={6} w={74} x={83} y={104} />
          </>
        )}
        {kind === "tree" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateFloatSoft }}>
              <rect fill="#fff" height="104" rx="16" stroke="#dbe4f0" width="164" x="38" y="28" />
            </g>
            <PreviewText fill="#94a3b8" size={10} weight={700} x={54} y={48}>权限树</PreviewText>
            <path d="M54 64l6 6-6 6" fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <rect fill="#409eff" height="14" rx="4" width="14" x="68" y="63" />
            <path d="M71 70l2.5 2.5 5-6" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
            <PreviewText fill="#475569" size={11} weight={700} x={90} y={74}>用户管理</PreviewText>
            <rect fill="#eff6ff" height="24" rx="8" width="118" x="68" y="84" />
            <rect fill="#fff" height="14" rx="4" stroke="#c8d4e0" width="14" x="78" y="89" />
            <PreviewText fill="#2563eb" size={11} weight={700} x={100} y={100}>角色权限</PreviewText>
            <rect fill="#fff" height="14" rx="4" stroke="#c8d4e0" width="14" x="78" y="112" />
            <PreviewText fill="#64748b" size={11} weight={700} x={100} y={123}>菜单配置</PreviewText>
          </>
        )}
        {kind === "auth" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.slateLargeSoft }}>
              <rect fill="#eaf4ff" height="100" rx="20" width="80" x="28" y="30" />
              <rect fill="#fff" height="100" rx="18" stroke="#dbe4f0" width="102" x="112" y="30" />
            </g>
            <rect fill="#409eff" height="18" rx="6" width="18" x="58" y="56" />
            <PreviewText anchor="middle" fill="#fff" size={11} weight={700} x={67} y={69}>S</PreviewText>
            <PreviewText fill="#2563eb" size={12} weight={700} x={50} y={92}>Sign in</PreviewText>
            <PreviewText fill="#334155" size={11} weight={700} x={128} y={52}>登录</PreviewText>
            <rect fill="#fff" height="20" rx="7" stroke="#dbe4f0" width="70" x="128" y="62" />
            <rect fill="#fff" height="20" rx="7" stroke="#dbe4f0" width="70" x="128" y="90" />
            <rect fill="#409eff" height="22" rx="8" width="70" x="128" y="118" />
          </>
        )}
        {kind === "brand" && (
          <>
            <g style={{ filter: PREVIEW_FILTERS.blueLarge }}>
              <rect fill="#409eff" height="42" rx="14" width="42" x="72" y="48" />
            </g>
            <PreviewText anchor="middle" fill="#fff" size={20} weight={700} x={93} y={76}>S</PreviewText>
            <PreviewText fill="#1e293b" size={16} weight={700} x={124} y={72}>Go Admin</PreviewText>
            <PreviewText fill="#64748b" size={11} weight={700} x={124} y={90}>UI System</PreviewText>
            <Pill color="#409eff" fill="#eef6ff" label="Admin" stroke="#d9ecff" w={44} x={98} y={112} />
          </>
        )}
      </svg>
    </Frame>
  );
}

function resolveKind(path: string): PreviewKind {
  if (path.includes("/button")) return "button";
  if (path.includes("/badge")) return "badge";
  if (path.includes("/breadcrumb")) return "breadcrumb";
  if (path.includes("/theme-toggle")) return "theme";
  if (path.includes("status-badge")) return "status";
  if (path.includes("/forms/")) {
    if (path.includes("calendar") || path.includes("date-")) return "calendar";
    if (path.includes("checkbox") || path.includes("radio") || path.includes("switch")) return "choice";
    if (path.includes("upload")) return "upload";
    if (path.includes("form") || path.includes("textarea")) return "form";
    return "input";
  }
  if (path.includes("/feedback/")) {
    if (path.includes("inline-notice")) return "notice";
    if (path.includes("empty-state")) return "empty";
    if (path.includes("skeleton")) return "skeleton";
    if (path.includes("toast")) return "toast";
    if (path.includes("popover") || path.includes("tooltip") || path.includes("dropdown")) return "popover";
    return "dialog";
  }
  if (path.includes("/data/")) {
    if (path.includes("pagination")) return "pagination";
    if (path.includes("tabs")) return "tabs";
    if (path.includes("progress")) return "progress";
    if (path.includes("avatar")) return "avatar";
    if (path.includes("icon")) return "icon";
    if (path.includes("log")) return "log";
    if (path.includes("metric")) return "metric";
    return "table";
  }
  if (path.includes("/layout/") || path.includes("/docs/")) {
    if (path.includes("auth")) return "auth";
    if (path.includes("brand")) return "brand";
    if (path.includes("watermark")) return "watermark";
    if (path.includes("progress-steps") || path.includes("wizard")) return "steps";
    if (path.includes("loading")) return "loading";
    if (path.includes("tree-selector")) return "tree";
    if (path.includes("search")) return "input";
    return "layout";
  }
  if (path.includes("auth")) return "auth";
  if (path.includes("brand")) return "brand";
  return "layout";
}

export function OverviewPreview({ kind, path }: { kind?: PreviewKind; path?: string }) {
  return <Canvas kind={kind ?? resolveKind(path ?? "")} />;
}
