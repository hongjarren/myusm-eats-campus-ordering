import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ToastContainer } from './Toast';
import { useToast } from './useToast';
import { Download, TrendingUp } from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

// NOTE: Heavy export libraries are now loaded on demand inside export handlers

type CafeLite = { id: string; name: string };
type StallLite = { id: string; cafeid: string; stallname: string };

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  subtotal: number | null;
  stall_id: string;
};

type SalesByCafe = { cafe_id: string; cafe_name: string; revenue: number; orders: number };
type SalesByStall = { stall_id: string; stall_name: string; cafe_id: string; cafe_name: string; revenue: number; orders: number };
type TrendPoint = { bucket: string; revenue: number };
type TopItem = { name: string; count: number };

type Grouping = 'day' | 'month';

export default function ReportGeneration() {
  /** Filters */
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: isoDate(start), end: isoDate(end) };
  });
  const [groupBy, setGroupBy] = useState<Grouping>('day');
  const [selectedCafe, setSelectedCafe] = useState<'all' | string>('all');

  /** Lookups */
  const [cafes, setCafes] = useState<CafeLite[]>([]);
  const [stalls, setStalls] = useState<StallLite[]>([]);

  /** Data */
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [salesByCafe, setSalesByCafe] = useState<SalesByCafe[]>([]);
  const [salesByStall, setSalesByStall] = useState<SalesByStall[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { toasts, showToast, removeToast } = useToast();

  /** Load lookups once */
  useEffect(() => {
    (async () => {
      try {
        const [{ data: cData, error: cErr }, { data: sData, error: sErr }] = await Promise.all([
          supabase.from('cafes').select('id, name').order('name', { ascending: true }),
          supabase.from('stall').select('id, cafeid, stallname'),
        ]);
        if (cErr) throw cErr;
        if (sErr) throw sErr;
        setCafes((cData || []) as CafeLite[]);
        setStalls((sData || []) as StallLite[]);
      } catch (e: any) {
        console.error(e);
        showToast(e?.message || 'Failed to load café/stall lookups', 'error');
      }
    })();
  }, []); // eslint-disable-line

  /** Fetch orders + compute aggregates on filter change */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchAndBuild();
      } catch (e: any) {
        console.error(e);
        showToast(e?.message || 'Failed to load report data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [dateRange, groupBy, selectedCafe, cafes, stalls]); // eslint-disable-line

  const fetchAndBuild = async () => {
    const { data: oData, error: oErr } = await supabase
      .from('orders')
      .select('id, status, created_at, subtotal, stall_id')
      .gte('created_at', dateRange.start)
      .lt('created_at', addOneDay(dateRange.end))
      .order('created_at', { ascending: true });

    if (oErr) throw oErr;
    const raw = (oData || []) as OrderRow[];

    // Filter by café if selected
    const cafeByStall = new Map(stalls.map((s) => [s.id, s.cafeid]));
    const nameByCafe = new Map(cafes.map((c) => [c.id, c.name]));
    const nameByStall = new Map(stalls.map((s) => [s.id, s.stallname]));

    const filtered =
      selectedCafe === 'all' ? raw : raw.filter((o) => cafeByStall.get(o.stall_id) === selectedCafe);
    setOrders(filtered);

    /** Sales by Café */
    const cafeAgg = new Map<string, SalesByCafe>();
    filtered.forEach((o) => {
      const cafeId = cafeByStall.get(o.stall_id);
      if (!cafeId) return;
      const node =
        cafeAgg.get(cafeId) ||
        { cafe_id: cafeId, cafe_name: nameByCafe.get(cafeId) || 'Unknown', revenue: 0, orders: 0 };
      node.orders += 1;
      if (o.status === 'completed') node.revenue += Number(o.subtotal || 0);
      cafeAgg.set(cafeId, node);
    });
    const cafeRows = Array.from(cafeAgg.values()).sort((a, b) => b.revenue - a.revenue);
    setSalesByCafe(cafeRows);

    /** Sales by Stall (within the filtered set) */
    const stallAgg = new Map<string, SalesByStall>();
    filtered.forEach((o) => {
      const stallId = o.stall_id;
      const cafeId = cafeByStall.get(stallId) || '';
      const node =
        stallAgg.get(stallId) ||
        {
          stall_id: stallId,
          stall_name: nameByStall.get(stallId) || 'Unknown',
          cafe_id: cafeId,
          cafe_name: nameByCafe.get(cafeId) || 'Unknown',
          revenue: 0,
          orders: 0,
        };
      node.orders += 1;
      if (o.status === 'completed') node.revenue += Number(o.subtotal || 0);
      stallAgg.set(stallId, node);
    });
    const stallRows = Array.from(stallAgg.values()).sort((a, b) => b.revenue - a.revenue);
    setSalesByStall(stallRows);

    /** Trend: group by day or month, completed revenue */
    const bucketAgg = new Map<string, number>();
    filtered.forEach((o) => {
      if (o.status !== 'completed') return;
      const d = new Date(o.created_at);
      const key = groupBy === 'day' ? isoDate(d) : ym(d);
      bucketAgg.set(key, (bucketAgg.get(key) || 0) + Number(o.subtotal || 0));
    });

    // produce sorted buckets in range
    const points: TrendPoint[] = [];
    if (groupBy === 'day') {
      for (let d = new Date(dateRange.start); d <= new Date(dateRange.end); d.setDate(d.getDate() + 1)) {
        const key = isoDate(d);
        points.push({ bucket: key, revenue: Number(bucketAgg.get(key) || 0) });
      }
    } else {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const limit = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= limit) {
        const key = ym(cursor);
        points.push({ bucket: key, revenue: Number(bucketAgg.get(key) || 0) });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    setTrend(points);

    /** Top items (quantity), for filtered orders */
    if (filtered.length === 0) {
      setTopItems([]);
      return;
    }
    const orderIds = filtered.map((o) => o.id);
    const chunks: string[][] = chunk(orderIds, 1000);
    const allItems: any[] = [];
    for (const ch of chunks) {
      const { data: itData, error: itErr } = await supabase
        .from('order_items')
        .select('quantity, menu_items:menu_item_id(name)')
        .in('order_id', ch);
      if (itErr) throw itErr;
      allItems.push(...(itData || []));
    }
    const counts = new Map<string, number>();
    allItems.forEach((row: any) => {
      const name = row.menu_items?.name || 'Unknown';
      const qty = Number(row.quantity || 0);
      counts.set(name, (counts.get(name) || 0) + qty);
    });
    const items = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setTopItems(items);
  };

  /** KPI computations */
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const completed = orders.filter((o) => o.status === 'completed');
    const revenue = completed.reduce((s, o) => s + Number(o.subtotal || 0), 0);
    const aov = completed.length ? revenue / completed.length : 0;
    const completionRate = totalOrders ? Math.round((completed.length / totalOrders) * 100) : 0;
    return { totalOrders, revenue, aov, completionRate };
  }, [orders]);

  /** Presets */
  const usePreset = (key: 'today' | 'thisMonth' | 'last30') => {
    const now = new Date();
    let start: Date;
    let end: Date;
    if (key === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = start;
    } else if (key === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 29);
    }
    setDateRange({ start: isoDate(start), end: isoDate(end) });
  };

  /** Exports: Excel (multi-sheet) & PDF (full summary) */
  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Summary
      const summary = [
        { Metric: 'Revenue', Value: kpis.revenue },
        { Metric: 'Total Orders', Value: kpis.totalOrders },
        { Metric: 'AOV', Value: kpis.aov },
        { Metric: 'Completion Rate (%)', Value: kpis.completionRate },
        { Metric: 'Start Date', Value: dateRange.start },
        { Metric: 'End Date', Value: dateRange.end },
        { Metric: 'Café Filter', Value: selectedCafe === 'all' ? 'All' : (cafes.find(c => c.id === selectedCafe)?.name || selectedCafe) },
        { Metric: 'Group By', Value: groupBy.toUpperCase() },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

      // Sales by Cafe
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(salesByCafe.map(r => ({
          cafe_id: r.cafe_id,
          cafe_name: r.cafe_name,
          revenue: r.revenue,
          orders: r.orders,
        }))),
        'Sales_by_Cafe'
      );

      // Sales by Stall
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(salesByStall.map(r => ({
          stall_id: r.stall_id,
          stall_name: r.stall_name,
          cafe_id: r.cafe_id,
          cafe_name: r.cafe_name,
          revenue: r.revenue,
          orders: r.orders,
        }))),
        'Sales_by_Stall'
      );

      // Trend
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(trend),
        'Trend'
      );

      // Top Items
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(topItems),
        'Top_Items'
      );

      const cafeLabel = selectedCafe === 'all' ? 'All' : (cafes.find(c => c.id === selectedCafe)?.name || selectedCafe);
      XLSX.writeFile(wb, `Report_${dateRange.start}_to_${dateRange.end}_${cafeLabel}.xlsx`);
      showToast('Excel exported', 'success');
    } catch {
      showToast('Failed to export Excel', 'error');
    }
  };

  const exportPDF = async () => {
    try {
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const cafeLabel =
        selectedCafe === 'all' ? 'All Cafés' : (cafes.find(c => c.id === selectedCafe)?.name || selectedCafe);

      // Header
      doc.setFontSize(16);
      doc.text('MyUSM Eats — Sales Report', 40, 40);
      doc.setFontSize(10);
      doc.text(
        `Range: ${dateRange.start} to ${dateRange.end}   |   Group: ${groupBy.toUpperCase()}   |   Café: ${cafeLabel}`,
        40,
        60
      );

      let cursorY = 80;

      // KPIs
      autoTable(doc, {
        startY: cursorY,
        head: [['Metric', 'Value']],
        body: [
          ['Revenue (RM)', (kpis.revenue || 0).toFixed(2)],
          ['Total Orders', String(kpis.totalOrders || 0)],
          ['AOV (RM)', (kpis.aov || 0).toFixed(2)],
          ['Completion Rate (%)', String(kpis.completionRate || 0)],
        ] as any,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [0, 136, 254] },
        margin: { left: 40, right: 40 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 16;

      // Sales by Café
      autoTable(doc, {
        startY: cursorY,
        head: [['Café', 'Revenue (RM)', 'Orders']],
        body: salesByCafe.map(r => [
          r.cafe_name || '—',
          (r.revenue || 0).toFixed(2),
          String(r.orders || 0),
        ]) as any,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [0, 196, 159] },
        margin: { left: 40, right: 40 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 16;

      // Sales by Stall
      autoTable(doc, {
        startY: cursorY,
        head: [['Stall', 'Café', 'Revenue (RM)', 'Orders']],
        body: salesByStall.map(r => [
          r.stall_name || '—',
          r.cafe_name || '—',
          (r.revenue || 0).toFixed(2),
          String(r.orders || 0),
        ]) as any,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 40, right: 40 },
        pageBreak: 'auto',
      });
      cursorY = (doc as any).lastAutoTable.finalY + 16;

      // Top Items (optional)
      if (topItems.length > 0) {
        autoTable(doc, {
          startY: cursorY,
          head: [['Item', 'Orders']],
          body: topItems.map(i => [i.name || '—', String(i.count || 0)]) as any,
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 6 },
          headStyles: { fillColor: [255, 187, 40] },
          margin: { left: 40, right: 40 },
        });
      }

      const safeName = `Report_${dateRange.start}_to_${dateRange.end}`.replace(/[^\w\-]+/g, '_');
      doc.save(`${safeName}.pdf`);
      showToast('PDF exported', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 dark:border-gray-700 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 text-slate-700 dark:text-gray-300 mb-3">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reports</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Start</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">End</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Café</label>
            <select
              value={selectedCafe}
              onChange={(e) => setSelectedCafe(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All cafés</option>
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Group by</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as Grouping)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="day">Day</option>
              <option value="month">Month</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button onClick={() => usePreset('today')} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-300">Today</button>
            <button onClick={() => usePreset('thisMonth')} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-300">This month</button>
            <button onClick={() => usePreset('last30')} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-300">Last 30d</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard label="Total Revenue" value={`RM ${kpis.revenue.toFixed(2)}`} />
        <KpiCard label="Total Orders" value={String(kpis.totalOrders)} />
        <KpiCard label="Average Order Value" value={`RM ${kpis.aov.toFixed(2)}`} />
        <KpiCard label="Completion Rate" value={`${kpis.completionRate}%`} />
      </div>

      {/* Trend */}
      <SectionCard title="Revenue Trend">
        <div className="w-full" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip formatter={(v: number | string) => `RM ${Number(v).toFixed(2)}`} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#0088FE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Sales by Café */}
      <SectionCard
        title="Sales by Café"
        actions={
          <div className="flex gap-2">
            <ActionBtn onClick={exportExcel} label="Excel" color="green" />
            <ActionBtn onClick={exportPDF} label="PDF" color="red" />
          </div>
        }
      >
        <div className="mb-6 w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByCafe.map((r) => ({ name: r.cafe_name, revenue: r.revenue }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(v: number | string) => `RM ${Number(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="revenue" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Café</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
              </tr>
            </thead>
            <tbody>
              {salesByCafe.map((r) => (
                <tr key={r.cafe_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{r.cafe_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">RM {r.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sales by Stall */}
      <SectionCard title="Sales by Stall">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stall</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Café</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
              </tr>
            </thead>
            <tbody>
              {salesByStall.map((r) => (
                <tr key={r.stall_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{r.stall_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{r.cafe_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">RM {r.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Top Items (compact table) */}
      {topItems.length > 0 && (
        <SectionCard title="Top 10 Menu Items">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((i, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{i.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{i.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/** ---------- UI helpers ---------- */
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function ActionBtn({
  onClick,
  label,
  color,
}: {
  onClick: () => void;
  label: string;
  color: 'green' | 'red' | 'blue';
}) {
  const colors =
    color === 'green'
      ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
      : color === 'red'
      ? 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
      : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600';
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 text-sm text-white rounded-lg ${colors}`}>
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}

/** ---------- utils ---------- */
function isoDate(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function ym(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}
function addOneDay(iso: string) {
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return isoDate(d);
}
function chunk<T>(arr: T[], n: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
  return res;
}
