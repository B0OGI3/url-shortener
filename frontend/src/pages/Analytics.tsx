import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getAnalytics } from '../lib/api';
import type { AnalyticsData } from '../lib/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const formatHour = (h: number) =>
  h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;

const formatNum = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-600 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function EmptyChart() {
  return <p className="text-center text-gray-300 text-sm py-8">No data yet</p>;
}

export default function Analytics() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    getAnalytics(code).then(setData).catch(() => setError('Failed to load analytics'));
  }, [code]);

  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (!data) return <p className="text-gray-400 text-sm">Loading…</p>;

  const uniquePct = data.totalClicks > 0
    ? Math.round((data.uniqueVisitors / data.totalClicks) * 100)
    : 0;

  const peakHour = [...data.clicksByHour].sort((a, b) => b.clicks - a.clicks)[0];
  const topCountry = data.clicksByCountry[0]?.country ?? '—';
  const topDevice = data.clicksByDevice[0]?.device ?? '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Analytics — <span className="font-mono text-blue-600">/{code}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">All time</p>
        </div>
        <Link to="/" className="text-sm text-blue-600 hover:underline mt-1">← Back</Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Clicks" value={data.totalClicks.toLocaleString()} />
        <StatCard
          label="Unique Visitors"
          value={data.uniqueVisitors.toLocaleString()}
          sub={`${uniquePct}% of clicks`}
        />
        <StatCard
          label="Peak Hour"
          value={peakHour.clicks > 0 ? formatHour(peakHour.hour) : '—'}
          sub={peakHour.clicks > 0 ? `${peakHour.clicks} clicks` : undefined}
        />
        <StatCard label="Top Country" value={topCountry} sub={topDevice !== '—' ? `mostly ${topDevice}` : undefined} />
      </div>

      {/* Clicks over time */}
      <ChartCard title="Clicks over time">
        {data.clicksByDate.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.clicksByDate}>
              <defs>
                <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={formatNum} />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), 'clicks']} />
              <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fill="url(#clicksGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Hourly + Day of week */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Clicks by hour of day">
          {data.clicksByHour.every(h => h.clicks === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.clicksByHour} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  tickFormatter={h => h % 6 === 0 ? formatHour(h) : ''}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={formatNum} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'clicks']} labelFormatter={formatHour} />
                <Bar dataKey="clicks" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Clicks by day of week">
          {data.clicksByDayOfWeek.every(d => d.clicks === 0) ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.clicksByDayOfWeek} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={formatNum} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'clicks']} />
                <Bar dataKey="clicks" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Country + City */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Top countries">
          {data.clicksByCountry.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.clicksByCountry.slice(0, 8)} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} tickFormatter={formatNum} />
                <YAxis dataKey="country" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), 'clicks']} />
                <Bar dataKey="clicks" fill="#3b82f6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top cities">
          {data.clicksByCity.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.clicksByCity.slice(0, 8)} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="city" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'clicks']} />
                <Bar dataKey="clicks" fill="#8b5cf6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Device + Browser + OS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ChartCard title="Device">
          {data.clicksByDevice.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.clicksByDevice} dataKey="clicks" nameKey="device" cx="50%" cy="50%" outerRadius={70}>
                  {data.clicksByDevice.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value, entry) => `${value}: ${(entry as { payload?: { clicks?: number } }).payload?.clicks ?? 0}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Browser">
          {data.clicksByBrowser.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.clicksByBrowser} dataKey="clicks" nameKey="browser" cx="50%" cy="50%" outerRadius={70}>
                  {data.clicksByBrowser.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value, entry) => `${value}: ${(entry as { payload?: { clicks?: number } }).payload?.clicks ?? 0}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Operating system">
          {data.clicksByOs.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.clicksByOs} dataKey="clicks" nameKey="os" cx="50%" cy="50%" outerRadius={70}>
                  {data.clicksByOs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} formatter={(value, entry) => `${value}: ${(entry as { payload?: { clicks?: number } }).payload?.clicks ?? 0}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top referrers */}
      {data.clicksByReferrer.length > 0 && (
        <ChartCard title="Top referrers">
          <div className="space-y-2">
            {data.clicksByReferrer.map((r, i) => {
              const pct = data.totalClicks > 0 ? (r.clicks / data.totalClicks) * 100 : 0;
              return (
                <div key={r.referrer} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="text-gray-600 truncate">{r.referrer}</span>
                      <span className="font-medium text-gray-900 ml-4 shrink-0">{r.clicks.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
}
