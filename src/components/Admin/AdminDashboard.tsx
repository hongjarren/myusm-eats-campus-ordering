import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users, Store, ShoppingBag, TrendingUp, FileText, Edit,
  RefreshCw, Crown, Clock, ArrowRight, LayoutGrid
} from 'lucide-react';

import { UserManagement } from './UserManagement';
import OrderOversight from './OrderOversight';
import { ManageCafes } from './ManageCafes';
import ReportGeneration from './ReportGeneration';
import { StallApplications } from './StallApplications';
import { StallUpdateApprovals } from './StallUpdateApprovals';

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

/* ====== Types ====== */
type RangeKey = 'today' | '7d' | '30d' | 'all';
type PrimaryCat =
  | 'dashboard'
  | 'people'
  | 'vendors'
  | 'ops'
  | 'orders_reports';

type VendorsTab = 'applications' | 'updates';
type OpsTab = 'cafes' | 'delivery'; // delivery is optional; shown but disabled if you want later
type OrdersReportsTab = 'orders' | 'reports';

type CafeLite = { id: string; name: string };
type StallLite = { id: string; cafeid: string };

/* ====== Component ====== */
export function AdminDashboard() {
  /* Primary navigation */
  const [cat, setCat] = useState<PrimaryCat>('dashboard');

  /* Secondary navigation per category */
  const [vendorsTab, setVendorsTab] = useState<VendorsTab>('applications');
  const [opsTab, setOpsTab] = useState<OpsTab>('cafes');
  const [orTab, setOrTab] = useState<OrdersReportsTab>('orders');

  /* Overview state (exactly as you had) */
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeCafes, setActiveCafes] = useState(0);

  const [range, setRange] = useState<RangeKey>('7d');
  const [ordersInRange, setOrdersInRange] = useState<number>(0);
  const [revenueInRange, setRevenueInRange] = useState<number>(0);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(0);

  const [trend, setTrend] = useState<Array<{ day: string; orders: number; revenue: number }>>([]);
  const [topCafes, setTopCafes] = useState<Array<{ name: string; revenue: number }>>([]);
  const [recentOrders, setRecentOrders] = useState<
    Array<{ id: string; cafe: string; total: number; created_at: string }>
  >([]);

  const [pendingStalls, setPendingStalls] = useState<number>(0);
  const [pendingUpdates, setPendingUpdates] = useState<number>(0);

  const [cafes, setCafes] = useState<CafeLite[]>([]);
  const [stalls, setStalls] = useState<StallLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Date helpers (unchanged) */
  const rangeDates = useMemo(() => {
    const today = new Date();
    let start: Date | null = null;
    if (range === 'today') start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    else if (range === '7d') { start = new Date(today); start.setDate(start.getDate() - 6); }
    else if (range === '30d') { start = new Date(today); start.setDate(start.getDate() - 29); }
    return { start, end: today };
  }, [range]);

  /* Initial load (unchanged) */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadCafes(), loadStalls()]);
        await Promise.all([loadLifetime(), loadOverviewData()]);
      } finally {
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel('admin-overview-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => hardRefresh(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Recompute range widgets when range changes (unchanged) */
  useEffect(() => {
    if (cat === 'dashboard') loadOverviewData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, cat]);

  /* Loaders (unchanged) */
  async function loadCafes() {
    const { data, error } = await supabase.from('cafes').select('id, name, is_active');
    if (!error && data) {
      setCafes(data.map((c: any) => ({ id: c.id, name: c.name })));
      setActiveCafes(data.filter((c: any) => c.is_active ?? true).length);
    }
  }
  async function loadStalls() {
    const { data } = await supabase.from('stall').select('id, cafeid');
    setStalls((data || []) as StallLite[]);
  }
  async function loadLifetime() {
    const [usersRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true })
    ]);
    setTotalUsers(usersRes.count || 0);

    try {
      const { count: c1 } = await supabase
        .from('stall')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending');
      setPendingStalls(c1 || 0);
    } catch {}
    try {
      const { count: c2 } = await supabase
        .from('stall_update_requests')
        .select('id', { count: 'exact', head: true })
        .eq('request_status', 'pending');
      setPendingUpdates(c2 || 0);
    } catch {}
  }
  async function loadOverviewData() {
    setRefreshing(true);
    try {
      let q = supabase
        .from('orders')
        .select('id, created_at, subtotal, status, stall_id')
        .order('created_at', { ascending: true });

      if (rangeDates.start) q = q.gte('created_at', rangeDates.start.toISOString());
      const endCap = new Date(rangeDates.end); endCap.setHours(23, 59, 59, 999);
      q = q.lte('created_at', endCap.toISOString());

      const { data: orders, error } = await q;
      if (error) throw error;

      const cafeByStall = new Map(stalls.map(s => [s.id, s.cafeid]));
      const cafeNameById = new Map(cafes.map(c => [c.id, c.name]));

      let ordersCount = 0;
      let revenue = 0;
      const byCafe = new Map<string, number>();
      const byDay = new Map<string, { orders: number; revenue: number }>();

      (orders || []).forEach((o: any) => {
        const dayKey = new Date(o.created_at).toLocaleDateString('en-MY', { month: 'short', day: '2-digit' });
        const isCompleted = String(o.status) === 'completed';
        ordersCount += 1;
        if (!byDay.has(dayKey)) byDay.set(dayKey, { orders: 0, revenue: 0 });
        const day = byDay.get(dayKey)!;
        day.orders += 1;
        if (isCompleted) {
          const val = Number(o.subtotal ?? 0);
          day.revenue += val;
          revenue += val;

          const cafeId = cafeByStall.get(o.stall_id || '');
          if (cafeId) byCafe.set(cafeId, (byCafe.get(cafeId) || 0) + val);
        }
      });

      const trendArr = Array.from(byDay.entries()).map(([day, { orders, revenue }]) => ({ day, orders, revenue }));
      setTrend(trendArr);
      setOrdersInRange(ordersCount);
      setRevenueInRange(revenue);
      setAvgOrderValue(ordersCount > 0 ? revenue / ordersCount : 0);

      const top = Array.from(byCafe.entries())
        .map(([cid, rev]) => ({ name: cafeNameById.get(cid) || 'Unknown', revenue: rev }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopCafes(top);

      const recent = (orders || [])
        .slice(-5).reverse()
        .map((o: any) => {
          const cafeId = cafeByStall.get(o.stall_id || '');
          return {
            id: o.id,
            cafe: cafeNameById.get(cafeId || '') || '—',
            total: String(o.status) === 'completed' ? Number(o.subtotal ?? 0) : 0,
            created_at: o.created_at as string
          };
        });
      setRecentOrders(recent);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }
  async function hardRefresh(showSpinner = true) {
    if (showSpinner) setRefreshing(true);
    await Promise.all([loadLifetime(), loadOverviewData()]);
    if (showSpinner) setRefreshing(false);
  }

  /* Loading guard for the dashboard page only */
  if (loading && cat === 'dashboard') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">System Overview & Management</p>
          </div>

          {/* Range + Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="pill-tab text-xs sm:text-sm shrink-0">Range:</div>
            <div className="flex flex-wrap items-center gap-2">
              {(['today','7d','30d','all'] as RangeKey[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`pill-tab text-xs sm:text-sm whitespace-nowrap min-h-[44px] ${range === r ? 'nav-tab--active' : ''}`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? 'Last 7d' : r === '30d' ? 'Last 30d' : 'All time'}
                </button>
              ))}
            </div>
            <button
              onClick={() => hardRefresh()}
              className="btn text-sm w-full sm:w-auto min-h-[44px]"
              title="Refresh"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== Primary Category Nav (equal width, button-like) ===== */}
      <div className="surface overflow-x-auto">
        <div className="flex border-b border-gray-200 dark:border-gray-800 min-w-max sm:min-w-0">
          <CategoryBtn
            active={cat === 'dashboard'} onClick={() => setCat('dashboard')}
            icon={<TrendingUp className="h-5 w-5" />} label="Dashboard"
          />
          <CategoryBtn
            active={cat === 'people'} onClick={() => setCat('people')}
            icon={<Users className="h-5 w-5" />} label="People"
          />
          <CategoryBtn
            active={cat === 'vendors'} onClick={() => setCat('vendors')}
            icon={<Store className="h-5 w-5" />} label="Vendors & Stalls"
          />
          <CategoryBtn
            active={cat === 'ops'} onClick={() => setCat('ops')}
            icon={<LayoutGrid className="h-5 w-5" />} label="Operations"
          />
          <CategoryBtn
            active={cat === 'orders_reports'} onClick={() => setCat('orders_reports')}
            icon={<FileText className="h-5 w-5" />} label="Orders & Reports"
          />
        </div>
      </div>

      {/* ===== Content per Category ===== */}

      {/* Dashboard / Overview (unchanged content) */}
      {cat === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <KPI icon={<Users className="h-6 w-6 text-blue-600" />} label="Total Users" value={totalUsers} bg="bg-blue-100" />
            <KPI icon={<Store className="h-6 w-6 text-green-600" />} label="Active Cafés" value={activeCafes} bg="bg-green-100" />
            <KPI icon={<ShoppingBag className="h-6 w-6 text-orange-600" />} label="Orders (range)" value={ordersInRange} bg="bg-orange-100" />
            <KPIMoney icon={<TrendingUp className="h-6 w-6 text-gray-700" />} label="Revenue (range)" amount={revenueInRange} bg="bg-gray-100" />
            <KPIMoney icon={<Crown className="h-6 w-6 text-purple-700" />} label="Avg Order Value" amount={avgOrderValue} bg="bg-purple-100" />
          </div>

          {/* Trend + Top Cafés */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Orders & Revenue Trend</h3>
              {trend.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-10 text-center">No data for this range.</div>
              ) : (
                <div className="w-full" style={{ height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                      <XAxis dataKey="day" stroke="currentColor" className="text-gray-600 dark:text-gray-400" />
                      <YAxis yAxisId="left" stroke="currentColor" className="text-gray-600 dark:text-gray-400" />
                      <YAxis yAxisId="right" orientation="right" stroke="currentColor" className="text-gray-600 dark:text-gray-400" />
                      <Tooltip 
                        formatter={(v: any, k: string) => (k === 'revenue' ? `RM ${Number(v).toFixed(2)}` : v)}
                        contentStyle={{ backgroundColor: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', color: 'var(--tooltip-text)' }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Top Cafés by Revenue (range)</h3>
              {topCafes.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No completed orders in this range.</div>
              ) : (
                <ul className="space-y-3">
                  {topCafes.map((c, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-5">{i + 1}.</span>
                        <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">RM {c.revenue.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Approvals + Recent Orders */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Pending Approvals</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="dark:text-gray-200">Stall applications</span>
                  </div>
                  <span className="font-semibold dark:text-white">{pendingStalls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="dark:text-gray-200">Stall update requests</span>
                  </div>
                  <span className="font-semibold dark:text-white">{pendingUpdates}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setCat('vendors'); setVendorsTab('applications'); }}
                        className="btn">
                  Review applications <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => { setCat('vendors'); setVendorsTab('updates'); }}
                        className="btn">
                  Review updates <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="xl:col-span-2 card">
              <h3 className="text-lg font-bold mb-4 dark:text-white">Recent Orders</h3>
              {recentOrders.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No orders yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Café</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{o.id}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{o.cafe}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{o.total ? `RM ${o.total.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              {new Date(o.created_at).toLocaleString('en-MY', {
                                year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* People */}
      {cat === 'people' && (
        <div className="space-y-4">
          {/* Single subtab, but still styled as a pill bar for consistency */}
          <SubTabBar
            tabs={[{ key: 'users', label: 'User Management', active: true, onClick: () => {} }]}
          />
          <UserManagement />
        </div>
      )}

      {/* Vendors & Stalls */}
      {cat === 'vendors' && (
        <div className="space-y-4">
          <SubTabBar
            tabs={[
              { key: 'applications', label: 'Stall Applications', active: vendorsTab === 'applications', onClick: () => setVendorsTab('applications') },
              { key: 'updates', label: 'Stall Updates', active: vendorsTab === 'updates', onClick: () => setVendorsTab('updates') },
            ]}
          />
          {vendorsTab === 'applications' ? <StallApplications /> : <StallUpdateApprovals />}
        </div>
      )}

      {/* Operations */}
      {cat === 'ops' && (
        <div className="space-y-4">
          <SubTabBar
            tabs={[
              { key: 'cafes', label: 'Manage Cafés', active: opsTab === 'cafes', onClick: () => setOpsTab('cafes') },
            ]}
          />
          {opsTab === 'cafes' && <ManageCafes />}
        </div>
      )}

      {/* Orders & Reports */}
      {cat === 'orders_reports' && (
        <div className="space-y-4">
          <SubTabBar
            tabs={[
              { key: 'orders', label: 'Orders & Performance', active: orTab === 'orders', onClick: () => setOrTab('orders') },
              { key: 'reports', label: 'Reports', active: orTab === 'reports', onClick: () => setOrTab('reports') },
            ]}
          />
          {orTab === 'orders' ? <OrderOversight /> : <ReportGeneration />}
        </div>
      )}
    </div>
  );
}

/* ====== UI Helpers (button-like tabs, equal width) ====== */

function CategoryBtn({
  active, icon, label, onClick,
}: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 nav-tab justify-center min-h-[44px] whitespace-nowrap px-3 sm:px-5 ${active ? 'nav-tab--active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
        <span className="sm:hidden" aria-hidden="true">{icon}</span>
        <span className="hidden sm:inline" aria-hidden="true">{icon}</span>
        <span className="text-xs sm:text-sm">{label}</span>
      </div>
    </button>
  );
}

/** SubTabBar renders a filled-pill bar with equal widths */
function SubTabBar({
  tabs,
}: {
  tabs: Array<{ key: string; label: string; active: boolean; onClick: () => void; disabled?: boolean }>;
}) {
  return (
    <div className="surface p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={t.disabled ? undefined : t.onClick}
            disabled={t.disabled}
            className={`flex-1 min-w-[100px] pill-tab text-xs sm:text-sm min-h-[44px] ${t.active ? 'nav-tab--active' : ''} ${t.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-current={t.active ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Small presentational KPI blocks */
function KPI({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="card">
      <div className="flex items-center space-x-3">
        <div className={`p-2 sm:p-3 ${bg} dark:${bg.replace('100', '900/40')} rounded-lg shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
function KPIMoney({ icon, label, amount, bg }: { icon: React.ReactNode; label: string; amount: number; bg: string }) {
  return (
    <div className="card">
      <div className="flex items-center space-x-3">
        <div className={`p-2 sm:p-3 ${bg} dark:${bg.replace('100', '900/40')} rounded-lg shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">RM {Number(amount || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
