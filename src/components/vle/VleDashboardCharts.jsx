import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

const PIE_TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #D2DEFF",
    fontSize: 13,
  },
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-[#D2DEFF] bg-white p-4 shadow-sm sm:p-5">
      <h3 className="font-semibold text-setu-charcoal">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-setu-muted">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  )
}

function pieTotal(data) {
  return (data || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0)
}

function piePercent(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function isPlaceholderPie(data, placeholderNames = ["No data", "No earnings"]) {
  return data?.length === 1 && placeholderNames.includes(data[0].name)
}

function DonutChart({ data, centerLabel, centerValue, valueFormatter = (v) => v }) {
  const total = pieTotal(data)
  const isPlaceholder = isPlaceholderPie(data)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={76}
            paddingAngle={total > 1 ? 3 : 0}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            {...PIE_TOOLTIP}
            formatter={(value, name) => [valueFormatter(value), name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {!isPlaceholder && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-setu-charcoal">{centerValue}</span>
          <span className="text-[10px] text-setu-muted">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}

function PieLegend({ items, total, valueSuffix = "", formatValue }) {
  if (isPlaceholderPie(items)) {
    return <p className="text-center text-sm text-setu-muted">No data for this period</p>
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((d) => {
        const pct = piePercent(d.value, total)
        const displayValue = formatValue ? formatValue(d.value) : `${d.value}${valueSuffix}`
        return (
          <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2 text-setu-charcoal">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 text-setu-muted">
              {displayValue} · {pct}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function VleDownloadPie({ data }) {
  const chartData =
    data?.length && !isPlaceholderPie(data)
      ? data
      : [{ name: "No data", value: 1, color: "#e2e8f0" }]
  const total = pieTotal(isPlaceholderPie(data) ? [] : data)
  const realData = isPlaceholderPie(data) ? [] : data || []

  return (
    <ChartCard
      title="App download status"
      subtitle="Has the citizen opened the SETU app?"
    >
      <DonutChart
        data={chartData}
        centerValue={total}
        centerLabel="citizens"
        valueFormatter={(v) => `${v} citizen${v !== 1 ? "s" : ""}`}
      />
      <PieLegend
        items={realData}
        total={total}
        valueSuffix={total === 1 ? " citizen" : " citizens"}
      />
    </ChartCard>
  )
}

export function VleMembershipPie({ data }) {
  const chartData =
    data?.length && !isPlaceholderPie(data)
      ? data
      : [{ name: "No data", value: 1, color: "#e2e8f0" }]
  const total = pieTotal(isPlaceholderPie(data) ? [] : data)
  const realData = isPlaceholderPie(data) ? [] : data || []

  return (
    <ChartCard
      title="Membership status"
      subtitle="Trial, paid active, or expired"
    >
      <DonutChart
        data={chartData}
        centerValue={total}
        centerLabel="registered"
        valueFormatter={(v) => `${v} user${v !== 1 ? "s" : ""}`}
      />
      <PieLegend items={realData} total={total} valueSuffix="" />
    </ChartCard>
  )
}

export function VleEarningsPie({ data }) {
  const realData = (data || []).filter(
    (d) => d.value > 0 && !["No earnings", "No data"].includes(d.name),
  )
  const totalInr = pieTotal(realData)

  if (!realData.length) {
    return (
      <ChartCard title="Wallet activity" subtitle="Money movement in selected period">
        <p className="py-10 text-center text-sm text-setu-muted">No wallet activity this period</p>
      </ChartCard>
    )
  }

  return (
    <ChartCard title="Wallet activity" subtitle="Money movement in selected period (₹)">
      <ul className="space-y-3">
        {realData.map((d) => {
          const pct = piePercent(d.value, totalInr)
          return (
            <li key={d.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="inline-flex items-center gap-2 font-medium text-setu-charcoal">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </span>
                <span className="text-setu-muted">
                  ₹{d.value} · {pct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#EEF3FF]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: d.color }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 border-t border-[#EEF3FF] pt-3 text-center text-sm text-setu-muted">
        Total in period: <span className="font-semibold text-setu-charcoal">₹{totalInr}</span>
      </p>
      <p className="mt-1 text-center text-[11px] text-setu-muted">
        Commission = ₹100 per registration · Deposits = you added money · Withdrawals = paid out
      </p>
    </ChartCard>
  )
}

export function VleRegistrationsBar({ data, period }) {
  const empty = !data?.length
  const chartData = empty ? [{ label: "—", count: 0 }] : data
  const barLabel =
    period === "day" ? "Registrations by hour" : period === "year" ? "Registrations by month" : "Registrations by day"

  return (
    <ChartCard title={barLabel} subtitle="Trend for selected period">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF3FF" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            interval={period === "month" ? "preserveStartEnd" : 0}
            angle={period === "month" ? -35 : 0}
            textAnchor={period === "month" ? "end" : "middle"}
            height={period === "month" ? 48 : 28}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip contentStyle={PIE_TOOLTIP.contentStyle} cursor={{ fill: "#EEF3FF" }} />
          <Bar dataKey="count" fill="#1C39BB" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      {empty && (
        <p className="text-center text-xs text-setu-muted">No registrations in this period yet.</p>
      )}
    </ChartCard>
  )
}

export function PeriodFilter({ value, onChange }) {
  const options = [
    { id: "day", label: "Day" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ]
  return (
    <div className="inline-flex w-full max-w-xs rounded-xl border border-[#D2DEFF] bg-white p-1 shadow-sm sm:w-auto sm:max-w-none">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`tap-target flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all sm:flex-none sm:px-4 ${
            value === opt.id
              ? "bg-[#1C39BB] text-white shadow-sm"
              : "text-setu-muted hover:bg-[#EEF3FF] hover:text-[#1C39BB]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
