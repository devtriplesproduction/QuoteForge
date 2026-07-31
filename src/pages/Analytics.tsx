
import { useMemo, useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/types';
import type { Quotation } from '@/lib/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  LabelList,
  Pie,
  PieChart,
  Cell,
  Sector,
} from 'recharts';

import {
  Send,
  CheckCircle,
  TrendingUp,
  DollarSign,
  BarChart3,
} from 'lucide-react';

function useAnimatedNumber(target: number, durationMs = 480) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number>();
  const fromRef = useRef(target);

  useEffect(() => {
    fromRef.current = value;
    const startTime = performance.now();
    const from = fromRef.current;
    const delta = target - from;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // ease-in-out-cubic — smooth acceleration and deceleration on both
      // ends, instead of ease-out-cubic which jumps hard on the first frame.
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setValue(from + delta * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

export default function Analytics() {
  const { quotations, currency, receipts, clients } = useApp();
  const [activeStatusIndex, setActiveStatusIndex] = useState<number | null>(null);
  const animatedExpand = useAnimatedNumber(activeStatusIndex !== null ? 1 : 0, 280);

  const liveQuotes = quotations.filter((q) => !q.is_template);

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const totalCreated = liveQuotes.length;
  const totalSent = liveQuotes.filter((q) => q.sent_at !== null || q.status === 'sent').length;
  const approved = liveQuotes.filter((q) => (q.status === 'accepted' || q.status === 'invoiced') && q.accepted_at !== null);
  const totalApproved = approved.length;
  const approvalRate = totalSent > 0 ? Math.round((totalApproved / totalSent) * 100) : 0;

  const totalApprovedValue = approved.reduce((sum, q) => sum + Number(q.total || 0), 0);

  const displayCurrency: Quotation['currency'] =
    (approved[0]?.currency || liveQuotes[0]?.currency || currency) as Quotation['currency'];

  /*
  const funnelData = useMemo(
  () => [
    { stage: 'Created', value: totalCreated },
    { stage: 'Sent', value: totalSent },
    { stage: 'Approved', value: totalApproved },
  ],
    [totalCreated, totalApproved, totalSent],
  );
  */

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    liveQuotes.forEach((q) => {
      const d = new Date(q.created_at);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.add(key);
    });

    return Array.from(months)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((key) => {
        const [y, m] = key.split('-');
        const d = new Date(Number(y), Number(m) - 1, 1);
        const label = d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
        return { key, label };
      });
  }, [liveQuotes]);

  const filteredQuotesForServices = useMemo(() => {
    if (selectedMonth === 'all') return liveQuotes;
    return liveQuotes.filter((q) => {
      const d = new Date(q.created_at);
      if (Number.isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [liveQuotes, selectedMonth]);

  const topServices = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();

    const add = (name: string, amount: number) => {
      const key = (name || 'Service').trim() || 'Service';
      const current = map.get(key) || { name: key, count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += Number.isFinite(amount) ? amount : 0;
      map.set(key, current);
    };

    filteredQuotesForServices.forEach((q) => {
      const blocks = q.service_blocks || [];
      if (blocks.length > 0) {
        blocks.forEach((b) => add(b.service_name || 'Service', Number(b.price || 0)));
        return;
      }

      const lines = q.services || [];
      if (lines.length > 0) {
        lines.forEach((s) => add(s.service_name || 'Service', Number(s.total || 0)));
        return;
      }

      // No line-item detail: attribute the quotation total to the quotation title.
      add(q.title || 'Quotation', Number(q.total || 0));
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredQuotesForServices]);

  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number }>();

    receipts.forEach((r) => {
      const client = clients.find((c) => c.id === r.client_id);
      const name = (client?.business_name || client?.name || 'Unknown Client').trim() || 'Unknown Client';
      const current = map.get(name) || { name, revenue: 0 };
      current.revenue += Number(r.amount || 0);
      map.set(name, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [receipts, clients]);

  const trendData = useMemo(() => {
    // last 6 months (month buckets)
    const now = new Date();
    const buckets: { key: string; label: string; created: number; approved: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(undefined, { month: 'short' });
      buckets.push({ key, label, created: 0, approved: 0 });
    }

    const byKey = new Map(buckets.map((b) => [b.key, b]));

    liveQuotes.forEach((q) => {
      const date = new Date(q.created_at);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = byKey.get(key);
      if (!bucket) return;
      bucket.created += 1;
      if (q.status === 'accepted' || q.status === 'invoiced') bucket.approved += 1;
    });

    return buckets;
  }, [liveQuotes]);

  const STATUS_META: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: '#f4f4f5' },
    sent: { label: 'Sent', color: '#a1a1aa' },
    accepted: { label: 'Accepted', color: '#3f3f46' },
    invoiced: { label: 'Invoiced', color: '#000000' },
    declined: { label: 'Declined', color: '#71717a' },
    expired: { label: 'Expired', color: '#d4d4d8' },
  };

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    liveQuotes.forEach((q) => {
      const status = q.status || 'draft';
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        name: STATUS_META[status]?.label || status,
        value: count,
        fill: STATUS_META[status]?.color || '#a1a1aa',
      }))
      .sort((a, b) => b.value - a.value);
  }, [liveQuotes]);

  const chartConfig = {
    created: { label: 'Created', color: 'hsl(var(--primary))' },
    approved: { label: 'Approved', color: 'hsl(var(--accent))' },
    value: { label: 'Count', color: 'hsl(var(--primary))' },
    revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
  } as const;

  const renderActiveDonutShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    const grow = animatedExpand * 7;
    const ringGap = animatedExpand * 4;
    const ringOpacity = animatedExpand * 0.35;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + grow}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={`url(#donutGradient-${fill.replace('#', '')})`}
          style={{ filter: `drop-shadow(0 ${4 + grow * 0.6}px ${10 + grow}px rgba(0,0,0,${0.15 + animatedExpand * 0.15}))` }}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={outerRadius + grow + ringGap}
          outerRadius={outerRadius + grow + ringGap + 3}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={ringOpacity}
        />
      </g>
    );
  };

  const kpis = [
    { label: 'Quotations Created', value: totalCreated, icon: BarChart3 },
    { label: 'Quotations Sent', value: totalSent, icon: Send },
    { label: 'Quotations Approved', value: totalApproved, icon: CheckCircle },
    { label: 'Approval Rate', value: `${approvalRate}%`, icon: TrendingUp },
    { label: 'Approved Value', value: formatCurrency(totalApprovedValue, displayCurrency), icon: DollarSign },
  ];

  if (liveQuotes.length === 0) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4 pb-2 border-b border-border/60">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-md shadow-black/10 ring-1 ring-black/5">
            <BarChart3 className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">Performance insights and metrics</p>
          </div>
        </div>

        <div className="text-center py-20 rounded-2xl border border-dashed border-border/70 bg-secondary/20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2 font-medium">No data yet</p>
          <p className="text-sm text-muted-foreground">Create and send quotations to start tracking approvals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 pb-2 border-b border-border/60">
        <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-md shadow-black/10 ring-1 ring-black/5">
          <BarChart3 className="w-7 h-7 text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Performance insights and metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="glass-card group relative overflow-hidden border border-border/60 hover:border-black/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-black/5 group-hover:bg-black transition-colors duration-300" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-secondary/50 group-hover:bg-black/5 transition-colors">
                  <kpi.icon className="w-5 h-5 text-foreground" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-3xl font-heading font-bold text-foreground tabular-nums">{kpi.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-black" />
              Top Paying Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="space-y-2">
              {topClients.length > 0 ? (
                topClients.map((c, idx) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-heading font-bold shrink-0 ${idx === 0
                          ? 'bg-black text-white'
                          : 'bg-secondary/70 text-foreground'
                          }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="font-medium text-foreground truncate max-w-[200px]">{c.name}</div>
                    </div>
                    <div className="font-heading font-bold text-foreground shrink-0">
                      {formatCurrency(c.revenue, displayCurrency)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">No payments received yet.</p>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
              Based on payments received (receipts).
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card border border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-black" />
              6-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 flex-1 flex flex-col min-h-0">
            <ChartContainer config={chartConfig} className="flex-1 w-full min-h-[260px]">
              <LineChart data={trendData} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, (dataMax: number) => {
                    const padded = dataMax + Math.max(2, Math.ceil(dataMax * 0.15));
                    return Math.ceil(padded / 3) * 3; // round up to nearest multiple of 3
                  }]}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="var(--color-created)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="var(--color-approved)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] overflow-hidden relative">
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4 relative">
            <div>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                Top Services (Revenue)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 ml-3.5">
                Ranked by total revenue generated
              </p>
            </div>
            <div className="w-full sm:w-56">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="rounded-xl h-9 border-border/70 hover:border-black/30 transition-colors">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="pt-5 relative">
            <ChartContainer
              config={{ revenue: { label: 'Revenue', color: 'hsl(var(--primary))' } }}
              className="h-[300px] w-full"
            >
              <BarChart data={topServices} margin={{ left: 8, right: 8, top: 20 }}>
                <defs>
                  <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="revenueBarGradientHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.85} />
                  </linearGradient>
                </defs>

                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} hide />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  width={40}
                />

                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--primary))', opacity: 0.06, radius: 8 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => {
                        if (typeof value === 'number') {
                          return (
                            <div className="flex flex-1 justify-between leading-none items-center gap-4 min-w-[160px]">
                              <span className="text-muted-foreground">Revenue</span>
                              <span className="font-mono font-semibold tabular-nums text-foreground">
                                {formatCurrency(value, displayCurrency)}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                      labelFormatter={(label, payload) => {
                        const p = payload?.[0]?.payload as { name?: string } | undefined;
                        return (
                          <span className="font-heading font-bold text-foreground">
                            {p?.name || String(label)}
                          </span>
                        );
                      }}
                    />
                  }
                />

                <Bar
                  dataKey="revenue"
                  fill="url(#revenueBarGradient)"
                  radius={[8, 8, 4, 4]}
                  maxBarSize={56}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  <LabelList
                    dataKey="revenue"
                    position="top"
                    offset={8}
                    formatter={(value: number) => formatCurrency(value, displayCurrency)}
                    style={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gradient-to-b from-primary to-primary/40" />
                Showing top {topServices.length} services
              </span>
              {topServices.length > 0 && (
                <span className="font-medium text-foreground">
                  Highest: {formatCurrency(Math.max(...topServices.map((s) => s.revenue)), displayCurrency)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.22)] overflow-hidden relative flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-black" />
              Quotation Status Breakdown
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 ml-3.5">
              Where every quotation stands right now
            </p>
          </CardHeader>

          <CardContent className="pt-5 flex-1 flex flex-col min-h-0">
            <div className="relative h-[300px] w-full">
              <ChartContainer
                config={{ value: { label: 'Quotations', color: 'hsl(var(--primary))' } }}
                className="h-full w-full"
              >
                <PieChart>
                  <defs>
                    {statusDistribution.map((entry) => (
                      <linearGradient
                        key={entry.status}
                        id={`donutGradient-${entry.fill.replace('#', '')}`}
                        x1="0" y1="0" x2="0" y2="1"
                      >
                        <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                        <stop offset="100%" stopColor={entry.fill} stopOpacity={0.72} />
                      </linearGradient>
                    ))}
                  </defs>

                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, _name, item) => {
                          const p = item?.payload as { name?: string } | undefined;
                          return (
                            <div className="flex flex-1 justify-between leading-none items-center gap-4 min-w-[140px]">
                              <span className="text-muted-foreground">{p?.name}</span>
                              <span className="font-mono font-semibold tabular-nums text-foreground">
                                {value}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={3.5}
                    cornerRadius={8}
                    animationBegin={100}
                    animationDuration={1100}
                    animationEasing="ease-out"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    activeIndex={activeStatusIndex ?? undefined}
                    activeShape={renderActiveDonutShape}
                    onMouseEnter={(_, index) => setActiveStatusIndex(index)}
                    onMouseLeave={() => setActiveStatusIndex(null)}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={`url(#donutGradient-${entry.fill.replace('#', '')})`}
                        style={{
                          cursor: 'pointer',
                          opacity: activeStatusIndex === null || activeStatusIndex === index ? 1 : 0.35,
                          transition: 'opacity 480ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Center total — crossfades smoothly between total and hovered segment */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div
                  key={activeStatusIndex ?? 'total'}
                  className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500"
                >
                  <span className="font-heading font-bold text-4xl text-foreground tabular-nums tracking-tight">
                    {activeStatusIndex !== null
                      ? statusDistribution[activeStatusIndex]?.value
                      : liveQuotes.length}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide font-medium">
                    {activeStatusIndex !== null ? statusDistribution[activeStatusIndex]?.name : 'Total Quotations'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-1 gap-y-1.5 text-xs border-t border-border/50 pt-3">
              {statusDistribution.map((entry, index) => {
                const isActive = activeStatusIndex === index;
                return (
                  <button
                    key={entry.status}
                    type="button"
                    onMouseEnter={() => setActiveStatusIndex(index)}
                    onMouseLeave={() => setActiveStatusIndex(null)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 ease-out ${isActive
                      ? 'bg-secondary shadow-sm scale-[1.03]'
                      : activeStatusIndex !== null
                        ? 'opacity-40'
                        : 'opacity-100 hover:bg-secondary/50'
                      }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-300"
                      style={{
                        backgroundColor: entry.fill,
                        transform: isActive ? 'scale(1.3)' : 'scale(1)',
                      }}
                    />
                    <span className="font-semibold text-foreground">{entry.value}</span>
                    <span className="text-muted-foreground">{entry.name}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}