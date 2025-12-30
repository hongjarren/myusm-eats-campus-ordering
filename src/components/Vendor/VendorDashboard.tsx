import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Stall, Order, MenuItem } from '../../lib/supabase';
import { Store, ShoppingBag, DollarSign, TrendingUp, Plus, ChevronRight, Edit, Wallet, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { RegisterStall } from './RegisterStall';
import { EditStall } from './EditStall';
import { ToggleStallStatus } from './ToggleStallStatus';
import NotificationsBell from './NotificationsBell'; // <-- NEW
import { ToastContainer } from '../Admin/Toast';
import { useToast } from '../Admin/useToast';
import { PendingGate } from './PendingGate';
import { OrderList } from './OrderList';
import { OrderCard } from './OrderCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  LineChart,
} from 'recharts';

type OrderFilterType = 'pending' | 'today' | 'total' | 'revenue' | 'withdrawal';

export function VendorDashboard() {
  const { profile, refreshProfile } = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [stall, setStall] = useState<(Stall & { location?: string }) | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [activeFilter, setActiveFilter] = useState<OrderFilterType>('pending');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [revenuePeriod, setRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const stats = useMemo(() => {
      const today = new Date().toLocaleDateString('en-CA'); 
      const todayOrders = orders.filter(o => {
        if (!o.created_at) return false;
        return new Date(o.created_at).toLocaleDateString('en-CA') === today;
      });
      const completedOrders = orders.filter(o => o.status === 'completed');
      const pendingOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status));
      const totalRevenue = completedOrders.reduce((sum, o: any) => sum + Number(o.total ?? o.subtotal ?? 0), 0);
      const availablePayout = stall?.available_payout || 0;
      return {
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        totalRevenue,
        availablePayout,
        pendingOrders: pendingOrders.length
      };
    }, [orders, stall]);

  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showEditStall, setShowEditStall] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const salesByHour = useMemo(() => {
      const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: 0, revenue: 0 }));
      const completedOrders = orders.filter(o => o.status === 'completed');
      for (const order of completedOrders) {
        const hour = new Date(order.created_at).getHours();
        hours[hour].orders += 1;
        hours[hour].revenue += order.subtotal || 0;
      }
      return hours.map(h => ({
        name: h.hour === 0 ? '12am' : h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? '12pm' : `${h.hour - 12}pm`,
        Revenue: h.revenue,
        Orders: h.orders,
      }));
    }, [orders]);

  const revenueChartData = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const formatData = (grouper: (date: Date) => string) => {
      const revenueByPeriod = completedOrders.reduce((acc, order) => {
        const date = new Date(order.created_at);
        const key = grouper(date);
        const revenue = Number(order.subtotal ?? 0);
        acc[key] = (acc[key] || 0) + revenue;
        return acc;
      }, {} as Record<string, number>);
      return Object.entries(revenueByPeriod)
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    };
    switch (revenuePeriod) {
      case 'monthly':
        return formatData(d => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
      case 'weekly':
        return formatData(d => {
          const day = d.getDay();
          const diff = d.getDate() - day;
          const startOfWeek = new Date(d.setDate(diff));
          return startOfWeek.toLocaleDateString('en-CA');
        });
      case 'daily':
      default:
        return formatData(d => d.toLocaleDateString('en-CA'));
    }
  }, [orders, revenuePeriod]);

  const averageOrderValue = useMemo(() => {
    if (revenuePeriod !== 'daily') return [];
    const dailyRevenue = revenueChartData;
    const countsByDate = orders
      .filter(o => o.status === 'completed')
      .reduce((acc, order) => {
        const date = new Date(order.created_at).toLocaleDateString('en-CA');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    return dailyRevenue
      .map(rev => {
        const count = countsByDate[rev.name] || 0;
        return { name: rev.name, AOV: count ? rev.revenue / count : 0 };
      })
      .filter(d => d.AOV > 0);
  }, [orders, revenuePeriod, revenueChartData]);

  const topItemsByCategory = useMemo(() => {
    const categoryCounts = new Map<string, Map<string, number>>();
    const completedOrders = orders.filter(o => o.status === 'completed');
    for (const order of completedOrders) {
      if (!order.order_items) continue;
      for (const item of order.order_items) {
        const itemName = item.menu_items?.name;
        const category = item.menu_items?.category || 'Other';
        if (!itemName) continue;
        if (!categoryCounts.has(category)) categoryCounts.set(category, new Map<string, number>());
        const itemMap = categoryCounts.get(category)!;
        itemMap.set(itemName, (itemMap.get(itemName) || 0) + item.quantity);
      }
    }
    const result = [];
    for (const [cat, map] of categoryCounts.entries()) {
      const items = Array.from(map.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      result.push({ category: cat, items });
    }
    return result.sort((a, b) => {
      if (a.category === 'Other') return 1;
      if (b.category === 'Other') return -1;
      return a.category.localeCompare(b.category);
    });
  }, [orders]);

  useEffect(() => {
    if (profile) fetchVendorData();
  }, [profile]);

  // ---- NEW: live-update the stall banner when the stall row changes (e.g., admin approved rename)
  useEffect(() => {
    if (!stall?.id) return;
    const channel = supabase
      .channel(`stall_row_${stall.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stall', filter: `id=eq.${stall.id}` },
        (payload) => {
          setStall(prev => (prev ? { ...prev, ...(payload.new as any) } : prev));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [stall?.id]);
  // ---- /NEW

  useEffect(() => {
    if (!activeCategory && topItemsByCategory.length > 0) {
      setActiveCategory(topItemsByCategory[0].category);
    }
    if (activeCategory && !topItemsByCategory.find(g => g.category === activeCategory)) {
      setActiveCategory(topItemsByCategory[0]?.category || '');
    }
  }, [topItemsByCategory, activeCategory]);

  const fetchVendorData = async () => {
    setLoading(true);
    const { data: stallData } = await supabase
      .from('stall')
      .select('*')
      .eq('vendorid', profile?.id)
      .maybeSingle();

    if (stallData) {
      setStall(stallData);
      const { data: cafeLocation } = await supabase
        .from('cafes')
        .select('location')
        .eq('id', stallData.cafeid)
        .maybeSingle();
      if (cafeLocation) setStall(prev => (prev ? { ...prev, location: cafeLocation.location } : prev));

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            special_instructions,
            menu_items ( name, category )
          )
        `)
        .eq('stall_id', stallData.id)
        .order('created_at', { ascending: false });

      if (!ordersError && ordersData) setOrders(ordersData as any[]);

      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('stallid', stallData.id)
        .order('name', { ascending: true });
      if (menuData) setMenuItems(menuData);

      if (stallData.approval_status === 'approved') {
        const seenKey = `stallApproved:${stallData.id}`;
        if (!localStorage.getItem(seenKey)) {
          setShowWelcome(true);
          localStorage.setItem(seenKey, '1');
        }
      }
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid amount to withdraw.', 'error');
      return;
    }
    if (amount > stats.availablePayout) {
      showToast('Withdrawal amount cannot exceed available payout.', 'error');
      return;
    }
    setIsWithdrawing(true);
    try {
      const { data: transferredAmount, error } = await supabase.rpc('process_vendor_payout', {
        vendor_stall_id: stall!.id,
        withdraw_amount: amount
      });
      if (error) throw error;
      showToast(`RM ${Number(transferredAmount).toFixed(2)} added to your wallet!`, 'success');
      await fetchVendorData();
      await refreshProfile();
      setWithdrawAmount('');
    } catch (err: any) {
      console.error("Payout error:", err);
      showToast(`Withdrawal failed: ${err.message}`, 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setOrders(current =>
      current.map(order => order.id === orderId ? { ...order, status: newStatus as any } : order)
    );
    if (newStatus === 'completed') {
      setTimeout(() => {
        fetchVendorData();
        refreshProfile();
      }, 500);
    }
  };

  const orderListTitle = {
    pending: 'Pending Orders',
    today: "Today's Orders",
    total: 'Total Orders',
    revenue: 'Revenue Report',
    withdrawal: 'Wallet Balance'
  }[activeFilter];

  const orderListLink = {
    pending: '/vendor/orders?filter=pending',
    today: '/vendor/orders?filter=today',
    total: '/vendor/orders',
    revenue: '#',
    withdrawal: '#'
  }[activeFilter];

  const todayStr = new Date().toLocaleDateString('en-CA');
  const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

  // Filter the orders to show based on the active tab
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'pending':
        return orders
          .filter(o => ['pending', 'preparing', 'ready'].includes(o.status)) // Keep 'ready' for pickup logic
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // Oldest first
      
      case 'today':
        return orders.filter(o => {
          const orderDate = new Date(o.created_at).toLocaleDateString('en-CA');
          return orderDate === todayStr;
        }); // Newest first (default fetch order)
        
      case 'total':
        return orders.filter(o => {
          const orderDate = new Date(o.created_at).toLocaleDateString('en-CA');
          return orderDate === todayStr || orderDate === yesterdayStr;
        }); // Newest first (default fetch order)
        
      default:
        return [];
    }
  }, [activeFilter, orders, todayStr, yesterdayStr]);

  // --- Create the lists for the different tabs ---
  
  // For 'Pending' tab (2 oldest delivery, 2 oldest pickup)
  const pendingDeliveryOrders = activeFilter === 'pending' 
    ? filteredOrders.filter(o => o.delivery_type === 'delivery' && (o.status === 'pending' || o.status === 'preparing')).slice(0, 2) 
    : [];
  
  const pendingPickupOrders = activeFilter === 'pending' 
    ? filteredOrders.filter(o => o.delivery_type === 'pickup' && (o.status === 'pending' || o.status === 'preparing' || o.status === 'ready')).slice(0, 2)
    : [];

  // For 'Today' and 'Total' tabs
  let sliceCount: number;
  let gridCols: number;

  if (activeFilter === 'today') {
    sliceCount = 4;
    gridCols = 4;
  // no per-card actions in 'today' overview
  } else if (activeFilter === 'total') {
    sliceCount = 2; 
    gridCols = 2;
  // no per-card actions in 'total' overview
  } else {
    // Default/Pending (these values aren't used for the new pending UI)
    sliceCount = 0; 
    gridCols = 2;
  // per-card actions used in pending UI below
  }
  
  const filteredOrdersToShow = filteredOrders.slice(0, sliceCount);

  const ordersPerDayChartData = useMemo(() => {
    if (activeFilter !== 'total') return [];
    const countsByDate = orders.reduce((acc, order) => {
      const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(countsByDate).map(([date, count]) => ({ date, orders: count })).slice(0, 7).reverse();
  }, [activeFilter, orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  interface KPIButtonProps {
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    label: string;
    value: string | number;
    isActive: boolean;
    onClick: () => void;
  }

  function KPIButton({ icon: Icon, iconColor, bgColor, label, value, isActive, onClick }: KPIButtonProps) {
    const isCurrency = typeof value === 'string' && value.startsWith('RM');
    return (
      <button
        onClick={onClick}
        // MODIFICATION 1: Use p-4 on mobile and p-6 on md screens
        className={`bg-white rounded-xl p-4 md:p-6 shadow-sm border ${
          isActive ? 'border-blue-600 ring-2 ring-blue-500' : 'border-gray-200'
        } transition-all duration-150 hover:shadow-md text-left`} // Added text-left
      >
        {/* MODIFICATION 2: Stack vertically on mobile (flex-col)
          and switch to horizontal on tablets (md:flex-row)
        */}
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center md:space-x-3">
          <div className={`p-3 ${bgColor} rounded-lg`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="mt-1 md:mt-0"> {/* Small top margin for stacked layout */}
            <p className="text-sm text-gray-600">{label}</p>
            {isCurrency ? (
              <p className="text-xl font-bold text-gray-900">{value}</p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <PendingGate pollMs={8000}>
      <div className="space-y-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {!stall ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Stall Registered</h2>
            <p className="text-gray-600 mb-6">You need to register your stall first</p>
            <button
              onClick={() => setShowRegister(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Register Stall</span>
            </button>

            {showRegister && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowRegister(false)} />
                <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                  <button
                    aria-label="Close"
                    onClick={() => setShowRegister(false)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                  >
                    ×
                  </button>
                  <RegisterStall
                    onRegistered={newStall => {
                      setStall(newStall);
                      setShowRegister(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative rounded-2xl p-8 text-white">
              {stall.imageurl && (
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden z-0"
                  style={{
                    backgroundImage: `url(${stall.imageurl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
              )}

              <div
                className={`absolute inset-0 rounded-2xl overflow-hidden z-10 ${
                  stall.imageurl ? 'bg-black/60' : 'bg-gradient-to-r from-green-600 to-green-700'
                }`}
              />

              <div className="relative z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-white/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-white/30 shadow-sm">
                    {stall.imageurl ? (
                      <img src={stall.imageurl} alt={stall.stallname} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="h-8 w-8 text-white/70" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold">{stall.stallname}</h1>
                      <button
                        onClick={() => setShowEditStall(true)}
                        className="p-2 rounded-full text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                        title="Edit stall details"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-green-100 mt-1">{stall.location} • Vendor Dashboard</p>
                  </div>
                </div>

                {/* RIGHT SIDE: Bell + Status toggle */}
                <div className="flex items-center gap-3">
                  <NotificationsBell />
                  <ToggleStallStatus
                    stall={stall}
                    onStatusUpdated={newStatus =>
                      setStall(prev => (prev ? { ...prev, stall_status: newStatus } : null))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Manage Menu */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manage Your Menu</h2>
                  {menuItems.length === 0 ? (
                    <p className="text-gray-600 mt-1">You haven't added any menu items yet.</p>
                  ) : (
                    <p className="text-gray-600 mt-1">
                      You currently have <strong>{menuItems.length}</strong> item(s) on your menu.
                    </p>
                  )}
                </div>

                <Link
                  to="/vendor/menu"
                  className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 flex-shrink-0"
                >
                  <span>Manage Menu</span>
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <KPIButton
                icon={ShoppingBag}
                iconColor="text-yellow-600"
                bgColor="bg-yellow-100"
                label="Pending Orders"
                value={stats.pendingOrders}
                isActive={activeFilter === 'pending'}
                onClick={() => setActiveFilter('pending')}
              />
              <KPIButton
                icon={TrendingUp}
                iconColor="text-orange-600"
                bgColor="bg-orange-100"
                label="Today's Orders"
                value={stats.todayOrders}
                isActive={activeFilter === 'today'}
                onClick={() => setActiveFilter('today')}
              />
              <KPIButton
                icon={ShoppingBag}
                iconColor="text-red-600"
                bgColor="bg-red-100"
                label="Total Orders"
                value={stats.totalOrders}
                isActive={activeFilter === 'total'}
                onClick={() => setActiveFilter('total')}
              />
              <KPIButton
                icon={DollarSign}
                iconColor="text-green-600"
                bgColor="bg-green-100"
                label="Total Revenue"
                value={`RM ${stats.totalRevenue.toFixed(2)}`}
                isActive={activeFilter === 'revenue'}
                onClick={() => setActiveFilter('revenue')}
              />
              <KPIButton
                icon={Wallet}
                iconColor="text-blue-600"
                bgColor="bg-blue-100"
                label="Available Payout"
                value={`RM ${stats.availablePayout.toFixed(2)}`}
                isActive={activeFilter === 'withdrawal'}
                onClick={() => setActiveFilter('withdrawal')}
              />
            </div>

            {/* Revenue Panel */}
            {activeFilter === 'revenue' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Revenue Summary</h2>
                    <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg mt-2 sm:mt-0">
                      <button
                        onClick={() => setRevenuePeriod('daily')}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${revenuePeriod === 'daily' ? 'bg-white shadow' : 'text-gray-600'}`}
                      >Daily</button>
                      <button
                        onClick={() => setRevenuePeriod('weekly')}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${revenuePeriod === 'weekly' ? 'bg-white shadow' : 'text-gray-600'}`}
                      >Weekly</button>
                      <button
                        onClick={() => setRevenuePeriod('monthly')}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${revenuePeriod === 'monthly' ? 'bg-white shadow' : 'text-gray-600'}`}
                      >Monthly</button>
                    </div>
                  </div>

                  <div className="h-72">
                    {revenueChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} tickFormatter={(v) => `RM${v}`} axisLine={false} />
                          <Tooltip formatter={(v) => [`RM ${Number(v).toFixed(2)}`, 'Revenue']} />
                          <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No revenue data for this period.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Most Ordered Items</h2>
                    {topItemsByCategory.length > 0 ? (
                      <div>
                        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                          {topItemsByCategory.map((group) => (
                            <button
                              key={group.category}
                              onClick={() => setActiveCategory(group.category)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                activeCategory === group.category ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {group.category}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-4">
                          {topItemsByCategory
                            .filter(group => group.category === activeCategory)
                            .map(group => (
                              <ul key={group.category} className="space-y-2">
                                {group.items.map((item, index) => (
                                  <li key={item.name} className="flex items-center justify-between text-sm py-1">
                                    <div className="flex items-center">
                                      <span className="font-medium text-gray-500 w-6">{index + 1}.</span>
                                      <span className="text-gray-800">{item.name}</span>
                                    </div>
                                    <span className="font-medium text-gray-600">{item.quantity} sold</span>
                                  </li>
                                ))}
                              </ul>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-600">
                        <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p>No item data found from completed orders.</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Peak Times (Sales by Hour)</h2>
                    <div className="h-72">
                      {salesByHour.filter(h => h.Revenue > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesByHour} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(v) => `RM${v}`} axisLine={false} />
                            <Tooltip formatter={(v, name) => [name === 'Revenue' ? `RM ${Number(v).toFixed(2)}` : v, name]} />
                            <Legend />
                            <Bar dataKey="Revenue" fill="#8884d8" />
                            <Bar dataKey="Orders" fill="#82ca9d" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No sales data found to show peak times.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Average Order Value (AOV)</h2>
                  <div className="h-72">
                    {averageOrderValue.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={averageOrderValue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} tickFormatter={(v) => `RM${(v as number).toFixed(2)}`} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                          <Tooltip formatter={(v) => [`RM ${Number(v).toFixed(2)}`, 'AOV']} />
                          <Legend />
                          <Line type="monotone" dataKey="AOV" stroke="#ff7300" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Not enough data to show AOV trend.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawal Panel */}
            {activeFilter === 'withdrawal' && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Withdraw Earnings</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Available Payout:</span>
                    <span className="text-2xl font-bold text-green-600">RM {stats.availablePayout.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">Current Wallet Balance:</span>
                    <span className="text-lg font-medium text-gray-900">RM {Number(profile?.credit_balance || 0).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={stats.availablePayout <= 0}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>Withdraw Earnings</span>
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    This transfers funds from your stall's earnings to your personal wallet balance.
                  </p>
                </div>
              </div>
            )}

            {/* Total Orders Graph */}
            {activeFilter === 'total' && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Total Orders (Recent Days)</h2>
                  <Link to="/vendor/orders" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    View All
                  </Link>
                </div>
                {ordersPerDayChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ordersPerDayChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="orders" name="Orders per Day" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p>No orders found.</p>
                  </div>
                )}
              </div>
            )}

            {/* 4. NEW: Show Pending Orders (in 4-column row) */}
            {activeFilter === 'pending' && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Pending Orders</h2>
                  <Link to="/vendor/orders?filter=pending" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    View All
                  </Link>
                </div>
                
                {pendingDeliveryOrders.length === 0 && pendingPickupOrders.length === 0 ? (
                  // Empty state
                  <div className="text-center py-8 text-gray-600">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p>No active orders right now.</p>
                  </div>
                ) : (
                  // Parent grid (2 columns: 1 for delivery, 1 for pickup)
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Section: Delivery */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">For Delivery</h3>
                      {pendingDeliveryOrders.length > 0 ? (
                        // Inner grid for delivery cards
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {pendingDeliveryOrders.map(order => (
                            <OrderCard 
                              key={order.id} 
                              order={order} 
                              onStatusUpdate={handleUpdateOrderStatus} 
                              showActions={true} 
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 pt-2">No pending delivery orders.</p>
                      )}
                    </div>
                    
                    {/* Right Section: Pickup */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">For Pickup</h3>
                      {pendingPickupOrders.length > 0 ? (
                        // Inner grid for pickup cards
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {pendingPickupOrders.map(order => (
                            <OrderCard 
                              key={order.id} 
                              order={order} 
                              onStatusUpdate={handleUpdateOrderStatus} 
                              showActions={true} 
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 pt-2">No pending pickup orders.</p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {activeFilter === 'today' && (
              <OrderList 
                title={orderListTitle}
                orders={filteredOrdersToShow}
                onUpdateStatus={handleUpdateOrderStatus} 
                viewAllLink={orderListLink}
                emptyMessage="No orders found for today."
                showActions={false}
                gridCols={gridCols}
              />
            )}

            {/* Edit stall modal */}
            {showEditStall && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditStall(false)} />
                <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
                  <button
                    aria-label="Close"
                    onClick={() => setShowEditStall(false)}
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center"
                  >
                    ×
                  </button>
                  <EditStall stall={stall} onClose={() => setShowEditStall(false)} showToast={showToast} />
                </div>
              </div>
            )}

            {/* One-time welcome modal after approval */}
            {showWelcome && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowWelcome(false)} />
                <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-xl font-bold">Your stall is approved! 🎉</h3>
                  <p className="mt-2 text-gray-600">
                    You can now publish your drafted items and start taking orders.
                  </p>
                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => setShowWelcome(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Go to dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Withdrawal dialog */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Withdraw Amount</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount to Withdraw (Available: RM {stats.availablePayout.toFixed(2)})
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">RM</span>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={() => setWithdrawAmount(stats.availablePayout.toFixed(2))}
                      className="text-sm text-green-600 hover:text-green-700 mt-1"
                    >
                      Withdraw All
                    </button>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => { setIsModalOpen(false); setWithdrawAmount(''); }}
                      disabled={isWithdrawing}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={
                        isWithdrawing ||
                        !withdrawAmount ||
                        parseFloat(withdrawAmount) <= 0 ||
                        parseFloat(withdrawAmount) > stats.availablePayout
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWithdrawing ? <Loader2 className="h-5 w-5 animate-spin" /> : <DollarSign className="h-5 w-5" />}
                      <span>Confirm Withdrawal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PendingGate>
  );
}
