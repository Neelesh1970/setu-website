import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const TOOLTIP = {
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

export function CoordinatorPeriodFilter({ value, onChange }) {
  const options = [
    { id: "day", label: "Day" },
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ]
  return (
    <div className="inline-flex w-full max-w-md rounded-xl border border-[#D2DEFF] bg-white p-1 shadow-sm sm:w-auto">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`tap-target flex-1 rounded-lg px-2 py-2 text-xs font-medium transition-all sm:px-3 sm:text-sm ${
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

export function CoordinatorRegistrationsBar({ data, period }) {
  const chartData = (data || []).map((row) => ({
    label: row.label,
    registrations: Number(row.registrations) || 0,
  }))

  return (
    <ChartCard
      title="Registrations over time"
      subtitle={period ? `Period: ${period}` : undefined}
    >
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-setu-muted">No registration data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF3FF" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="registrations" fill="#1C39BB" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}

export function CoordinatorRevenueBar({ data, period }) {
  const chartData = (data || []).map((row) => ({
    label: row.label,
    revenue: Number(row.revenueInr) || 0,
  }))

  return (
    <ChartCard title="District revenue" subtitle={period ? `Period: ${period}` : undefined}>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-setu-muted">No revenue data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEF3FF" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              {...TOOLTIP}
              formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Revenue"]}
            />
            <Bar dataKey="revenue" fill="#2B5BFF" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  )
}
