import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '../../lib/supabase';
import { ToastContainer } from './Toast';
import { useToast } from './useToast';
import { ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Label,
} from 'recharts';

/** ---- Lightweight types that match what we actually query ---- */
type CafeLite = { id: string; name: string };
type StallLite = { id: string; cafeid: string; vendorid: string };

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  subtotal: number | null;
  stall_id: string;
  profiles?: { full_name?: string | null } | null;
};

type OrderWithDetails = {
  id: string;
  status: string;
  created_at: string;
  subtotal: number;
  stall_id: string;
  cafe_id?: string;
  cafe_name?: string;
  customer_name?: string;
};

type VendorPerformance = {
  cafe_id: string;
  cafe_name: string;
  total_orders: number;
  avg_prep_time: number;
  total_revenue: number;
};

/** Fixed status order for chips & donut (matches your UI) */
const STATUS_ORDER: Array<{ key: string; label: string }> = [
  { key: 'pending',           label: 'Pending' },
  { key: 'ready',             label: 'Ready' },
  { key: 'out_for_delivery',  label: 'Out for Delivery' },
  { key: 'completed',         label: 'Completed' },
];

/** Solid hex colors tied to each status (used for donut, legend, and chips) */
const STATUS_COLOR_HEX: Record<string, string> = {
  pending: '#F59E0B',          // amber-500
  ready: '#3B82F6',            // blue-500
  out_for_delivery: '#F97316', // orange-500
  completed: '#22C55E',        // green-500
};

/* -------------------- Pretty Donut -------------------- */
function renderPointerLabel({ cx, cy, midAngle, outerRadius, percent, name, value }: any) {
  const RAD = Math.PI / 180;
  const r = outerRadius + 8;
  const x = cx + Math.cos(-midAngle * RAD) * r;
  const y = cy + Math.sin(-midAngle * RAD) * r;
  const x2 = cx + Math.cos(-midAngle * RAD) * (r + 14);
  const y2 = cy + Math.sin(-midAngle * RAD) * (r + 14);
  const xText = x2 + (x2 > cx ? 8 : -8);
  const pct = Math.round((percent || 0) * 100);
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const lineColor = isDark ? '#475569' /* slate-600 */ : '#CBD5E1' /* slate-300 */;
  const labelColor = isDark ? '#CBD5E1' /* slate-300 */ : '#334155' /* slate-700 */;

  return (
    <g>
      <polyline points={`${x},${y} ${x2},${y2}`} fill="none" stroke={lineColor} strokeWidth={1.5} />
      <text
        x={xText}
        y={y2}
        textAnchor={x2 > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fill={labelColor}
      >
        {name} • {value} ({pct}%)
      </text>
    </g>
  );
}

function StatusDonut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const hasData = data.some(d => d.value > 0);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const multi = data.filter(d => d.value > 0).length > 1;

  if (!hasData) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-8 text-center text-slate-500">
        No data for the current filters
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] mx-auto">
      <div className="w-full" style={{ height: '340px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 48, right: 40, bottom: 32, left: 40 }}>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={72}
              outerRadius={100}
              paddingAngle={2}
              cornerRadius={6}
              stroke="white"
              strokeWidth={3}
              cy="55%"
              labelLine={multi}
              label={multi ? renderPointerLabel : undefined}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <Label value={total} position="center" className="fill-slate-800 dark:fill-slate-200" fontSize={22} fontWeight={700} />
            </Pie>

            <Tooltip
              formatter={(v: number, _n: string, e: any) => {
                const pct = total ? Math.round((v / total) * 100) : 0;
                return [`${v} orders (${pct}%)`, e.payload.name];
              }}
              contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', color: 'var(--tooltip-text)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend reflects the same colors */}
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-sm">
        {data.map((d, i) => (
          <span key={`${d.name}-${i}`} className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================ Main ============================ */

export default function OrderOversight() {
  const [activeTab, setActiveTab] = useState<'orders' | 'performance'>('orders');
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([]);
  const [vendors, setVendors] = useState<VendorPerformance[]>([]);
  const [cafes, setCafes] = useState<CafeLite[]>([]);
  const [stalls, setStalls] = useState<StallLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCafe, setSelectedCafe] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchCafes();
        await fetchStalls();
        await fetchOrders();
        await fetchVendorPerformance();
      } catch (e) {
        console.error(e);
        showToast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    })();

    const sub = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        fetchVendorPerformance();
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, selectedCafe, selectedStatus, dateRange]);

  /** -------------------- Loaders -------------------- */
  const fetchCafes = async () => {
    try {
      const { data, error } = await supabase.from('cafes').select('id, name');
      if (error) throw error;
      setCafes((data || []) as CafeLite[]);
    } catch (error) {
      console.error('fetchCafes error:', error);
      showToast('Failed to fetch cafés', 'error');
    }
  };

  const fetchStalls = async () => {
    try {
      const { data, error } = await supabase.from('stall').select('id, cafeid, vendorid');
      if (error) throw error;
      setStalls((data || []) as StallLite[]);
    } catch (error) {
      console.error('fetchStalls error:', error);
      showToast('Failed to fetch stalls', 'error');
    }
  };

  const fetchOrders = async () => {
    try {
      // 1) Orders
      const ordersQ = supabase
        .from('orders')
        .select('id, status, created_at, subtotal, stall_id, profiles:customer_id(full_name)')
        .order('created_at', { ascending: false });

      // 2) Stalls (reuse state if available)
      const stallsQ =
        stalls.length > 0
          ? Promise.resolve({ data: stalls as any, error: null })
          : supabase.from('stall').select('id, cafeid');

      // 3) Cafés (reuse state if available)
      const cafesQ =
        cafes.length > 0
          ? Promise.resolve({ data: cafes as any, error: null })
          : supabase.from('cafes').select('id, name');

      const [{ data: oData, error: oErr }, { data: sData, error: sErr }, { data: cData, error: cErr }] =
        await Promise.all([ordersQ, stallsQ, cafesQ]);

      if (oErr) throw oErr;
      if (sErr) throw sErr;
      if (cErr) throw cErr;

      if (stalls.length === 0) setStalls((sData || []) as StallLite[]);
      if (cafes.length === 0) setCafes((cData || []) as CafeLite[]);

      const cafeIdByStallId = new Map<StallLite['id'], StallLite['cafeid']>(
        ((sData || []) as StallLite[]).map((s) => [s.id, s.cafeid])
      );
      const cafeNameById = new Map<CafeLite['id'], CafeLite['name']>(
        ((cData || []) as CafeLite[]).map((c) => [c.id, c.name])
      );

      const cooked: OrderWithDetails[] = ((oData as OrderRow[] | null) || []).map((o) => {
        const cafe_id = cafeIdByStallId.get(o.stall_id);
        const cafe_name = cafe_id ? cafeNameById.get(cafe_id) : undefined;
        return {
          id: o.id,
          status: o.status,
          created_at: o.created_at,
          subtotal: Number(o.subtotal ?? 0),
          stall_id: o.stall_id,
          cafe_id,
          cafe_name,
          customer_name: o.profiles?.full_name ?? 'Unknown',
        };
      });

      setOrders(cooked);
    } catch (error: any) {
      console.error('fetchOrders error:', error?.message || error);
      showToast('Failed to fetch orders', 'error');
    }
  };

  const fetchVendorPerformance = async () => {
    try {
      let cafesData = cafes;
      if (cafesData.length === 0) {
        const { data: cData, error: cErr } = await supabase.from('cafes').select('id, name');
        if (cErr) throw cErr;
        cafesData = (cData || []) as CafeLite[];
        setCafes(cafesData);
      }

      let stallsData = stalls;
      if (stallsData.length === 0) {
        const { data: sData, error: sErr } = await supabase.from('stall').select('id, cafeid, vendorid');
        if (sErr) throw sErr;
        stallsData = (sData || []) as StallLite[];
        setStalls(stallsData);
      }

      const cafeIdByStallId = new Map(stallsData.map((s) => [s.id, s.cafeid]));

      const { data: ordersData, error: oErr } = await supabase
        .from('orders')
        .select('id, stall_id, subtotal, status');
      if (oErr) throw oErr;

      // Initialize all cafés so 0-value cafés still show
      const perfMap = new Map<string, VendorPerformance>();
      cafesData.forEach((c) =>
        perfMap.set(c.id, {
          cafe_id: c.id,
          cafe_name: c.name,
          total_orders: 0,
          avg_prep_time: 15,
          total_revenue: 0,
        })
      );

      (ordersData || []).forEach((o: any) => {
        const cafeId = cafeIdByStallId.get(o.stall_id);
        if (!cafeId) return;
        const node = perfMap.get(cafeId)!;
        node.total_orders += 1;
        if (o.status === 'completed') {
          node.total_revenue += Number(o.subtotal ?? 0);
        }
      });

      setVendors(Array.from(perfMap.values()));
    } catch (error: any) {
      console.error('fetchVendorPerformance error:', error?.message || error);
      showToast('Failed to fetch vendor performance', 'error');
    }
  };

  /** -------------------- Filtering -------------------- */
  const filterOrders = () => {
    let filtered = [...orders];

    if (selectedCafe !== 'all') filtered = filtered.filter((o) => o.cafe_id === selectedCafe);
    if (selectedStatus !== 'all') filtered = filtered.filter((o) => o.status === selectedStatus);

    if (dateRange.start) filtered = filtered.filter((o) => new Date(o.created_at) >= new Date(dateRange.start));
    if (dateRange.end) {
      const endInclusive = new Date(dateRange.end);
      endInclusive.setDate(endInclusive.getDate() + 1);
      filtered = filtered.filter((o) => new Date(o.created_at) < endInclusive);
    }

    setFilteredOrders(filtered);
  };

  /** -------------------- Helpers & chart data -------------------- */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
      case 'ready':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      // fallback for any other statuses, e.g. "preparing"
      case 'preparing':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Counts for filtered rows
  const statusCounts = filteredOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Donut data in fixed order (exclude statuses not in STATUS_ORDER)
  const statusChartData = STATUS_ORDER.map(({ key, label }) => ({
    key,
    name: label.toUpperCase(),
    value: statusCounts[key] || 0,
    color: STATUS_COLOR_HEX[key],
  }));

  // Display either all non-zero, or just the selected status
  const chartForDisplay = useMemo(() => {
    const nonZero = statusChartData.filter(d => d.value > 0);
    if (selectedStatus === 'all') return nonZero;
    return nonZero.filter(d => d.key === selectedStatus);
  }, [statusChartData, selectedStatus]);

  const totalStatuses = statusChartData.reduce((s, d) => s + d.value, 0);
  const completionRate = totalStatuses
    ? Math.round(((statusCounts['completed'] || 0) / totalStatuses) * 100)
    : 0;

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>Active Orders</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'performance'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span>Vendor Performance</span>
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <Fragment>
          {/* KPI pills */}
          <div className="flex flex-wrap gap-3">
            <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-slate-700 dark:text-gray-300 shadow-sm">
              Total orders: <span className="font-semibold">{totalStatuses}</span>
            </div>
            <div className="px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-slate-700 dark:text-gray-300 shadow-sm">
              Completion rate: <span className="font-semibold">{completionRate}%</span>
            </div>
          </div>

          {/* Donut Card */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Order Status Breakdown</h3>
            <StatusDonut data={chartForDisplay.map(({ name, value, color }) => ({ name, value, color }))} />
          </div>

          {/* Sticky Filters */}
          <div className="card sticky top-1 z-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Café */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Café</label>
                <select
                  value={selectedCafe}
                  onChange={(e) => setSelectedCafe(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Cafés</option>
                  {cafes.map((cafe) => (
                    <option key={cafe.id} value={cafe.id}>{cafe.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  {STATUS_ORDER.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Quick-filter chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1 rounded-full text-xs border ${
                  selectedStatus === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                }`}
              >
                All
              </button>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSelectedStatus(s.key)}
                  className={`px-3 py-1 rounded-full text-xs border flex items-center gap-2 ${
                    selectedStatus === s.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR_HEX[s.key] }} />
                  {s.label}
                  <span className="opacity-70">({statusCounts[s.key] || 0})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table (no Actions column) */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ORDER #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CAFÉ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CUSTOMER</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">STATUS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">TOTAL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CREATED</th>
                  </tr>
                </thead>

                {filteredOrders.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={6} className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                            <ShoppingBag className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="font-medium text-slate-800 dark:text-slate-200">No orders match your filters</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">Try adjusting the date range or status.</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{order.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{order.cafe_name ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{order.customer_name ?? '—'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          RM {Number(order.subtotal ?? 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </Fragment>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Orders per Café */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Orders per Café</h3>
              <div className="w-full" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={vendors.map((v) => ({ name: v.cafe_name, orders: v.total_orders }))}
                    margin={{ left: 8, right: 8, bottom: 18 }}
                  >
                    {/* Axis/grid styled for both themes */}
                    <CartesianGrid strokeDasharray="3 3" stroke={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'} />
                    <XAxis
                      dataKey="name"
                      tickFormatter={(value) => value}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      tick={{ fontSize: 12, fill: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#9CA3AF' : '#475569' }}
                      axisLine={{ stroke: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#4B5563' : '#E5E7EB' }}
                      height={50}
                    />
                    <YAxis tick={{ fill: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#9CA3AF' : '#475569' }} axisLine={{ stroke: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#4B5563' : '#E5E7EB' }} />
                    <Tooltip contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', color: 'var(--tooltip-text)' }} />
                    <Legend formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} wrapperStyle={{ color: 'inherit' }} />
                    <Bar dataKey="orders" fill="#1C7ED6" background={{ fill: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'rgba(255,255,255,0.06)' : '#f2f2f2' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue per Café */}
            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Revenue per Café</h3>
              <div className="w-full" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={vendors.map((v) => ({ name: v.cafe_name, revenue: v.total_revenue }))}
                    margin={{ left: 8, right: 8, bottom: 18 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#374151' : '#E5E7EB'} />
                    <XAxis
                      dataKey="name"
                      tickFormatter={(value) => value}
                      interval={0}
                      angle={-12}
                      textAnchor="end"
                      tick={{ fontSize: 12, fill: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#9CA3AF' : '#475569' }}
                      axisLine={{ stroke: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#4B5563' : '#E5E7EB' }}
                      height={50}
                    />
                    <YAxis tick={{ fill: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#9CA3AF' : '#475569' }} axisLine={{ stroke: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? '#4B5563' : '#E5E7EB' }} />
                    <Tooltip formatter={(value: number) => `RM ${Number(value).toFixed(2)}`} contentStyle={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', color: 'var(--tooltip-text)' }} />
                    <Legend formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} wrapperStyle={{ color: 'inherit' }} />
                    <Bar dataKey="revenue" fill="#12B886" background={{ fill: (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'rgba(255,255,255,0.06)' : '#f2f2f2' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Vendor table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CAFÉ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">TOTAL ORDERS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">AVG PREP TIME</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">REVENUE</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.cafe_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {vendor.cafe_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{vendor.total_orders}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          {vendor.avg_prep_time} min
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        RM {vendor.total_revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
