import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  MapPin,
  Clock,
  User,
  Edit3,
  CreditCard,
  History,
  X,
  Loader2,
  ChefHat,
  CheckCircle2,
  Truck,
  Home,
  Search,
  ShoppingCart,
} from 'lucide-react';
import { MenuList } from './MenuList';
import { Cart } from './cart';
import { useAuth } from '../../contexts/AuthContext';
import { Checkout } from './checkout';


interface Cafe {
  id: string;
  name: string;
  location?: string;
  image_url?: string;
  operating_hours?: string;
  description?: string;
}

interface ProfileRow {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  hostel_address?: string | null;
  role?: string | null;
  email?: string | null;
  vendor_status?: string | null;
  credit_balance?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  profile_image?: string;
}

// Add: Order/OrderItem types
interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  special_instructions?: string | null;
  menu_item?: {
    name?: string;
    image_url?: string;
  } | null;
}

interface Order {
  id: string;
  customer_id: string;
  status?: string | null;
  delivery_type?: string | null;
  delivery_address?: string | null;
  subtotal?: number | null;
  notes_to_driver?: string | null;
  estimated_delivery_time?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  stall_id?: string | null;
  driver_id?: string | null;
  order_items?: OrderItem[];
  stall?: { name?: string } | null;
}

export function StudentDashboard() {
  const { user, profile: authProfile } = useAuth() as any;
  const authId = user?.id ?? authProfile?.id ?? null;

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [cafesLoading, setCafesLoading] = useState<boolean>(false);
  const [cafesError, setCafesError] = useState<string | null>(null);
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileRow>>({});
  const [topupAmount, setTopupAmount] = useState<number | ''>('');
  const [showTopupSuccess, setShowTopupSuccess] = useState(false);

  // Add: Orders popup + data state
  const [showOrdersPopup, setShowOrdersPopup] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [checkoutData, setCheckoutData] = useState<{
    stall: string;
    items: any[];
    total: number;
  } | null>(null);


  useEffect(() => {
    fetchCafes();
  }, []);

  useEffect(() => {
    if (authId) fetchProfile(authId);
  }, [authId]);

  const fetchCafes = async () => {
    setCafesLoading(true);
    setCafesError(null);
    try {
      const { data, error } = await supabase.from('cafes').select('*');
      if (error) throw error;
      setCafes(data || []);
    } catch (e: any) {
      console.error('Error fetching cafes:', e?.message || e);
      setCafesError(e?.message || 'Failed to load cafeterias');
    } finally {
      setCafesLoading(false);
    }
  };

  const fetchProfile = async (id: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) console.error('Error fetching profile:', error.message);
    else setProfile(data as ProfileRow);
  };

  // Add: helpers for formatting
  const formatCurrency = (n?: number | null) => `RM ${Number(n ?? 0).toFixed(2)}`;
  const formatDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString() : '-';

  // ==== Status helpers for Order History ===
  const norm = (s?: string | null) => (s || '').toLowerCase();
  const isCompleted = (s?: string | null) =>
    ['completed', 'complete'].includes(norm(s));
  const isActiveOrder = (s?: string | null) =>
    !!s && !isCompleted(s) && norm(s) !== 'cancelled';

  // unify completed/complete
  const unify = (s?: string | null) => {
    const n = norm(s);
    return n === 'completed' ? 'complete' : n;
  };

  // Badge color per status
  const statusBadgeCls = (s?: string | null) => {
    switch (unify(s)) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };
  
  const statusMessage = (s?: string | null) => {
    switch (unify(s)) {
      case 'pending':
        return "Kitchen is preparing your order";
      case 'ready':
        return 'Your order is ready';
      case 'out_for_delivery':
        return 'Driver is delivering your order';
      case 'complete':
        return 'Your order is complete';
      default:
        return s || 'pending';
    }
  };
  
  // Color set per step key
  const stepColors = (key: 'pending' | 'ready' | 'out_for_delivery' | 'complete') => {
    switch (key) {
      case 'pending':
        return { dot: 'bg-yellow-100 text-yellow-800 border-yellow-300', bar: 'bg-yellow-500' };
      case 'ready':
        return { dot: 'bg-blue-100 text-blue-800 border-blue-300', bar: 'bg-blue-500' };
      case 'out_for_delivery':
        return { dot: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-400' };
      case 'complete':
        return { dot: 'bg-green-100 text-green-800 border-green-300', bar: 'bg-green-500' };
    }
  };

  // Build animated progress bar. Delivery = 4 steps, Pickup = 3 steps (no delivery step).
  const ProgressBar = ({
  status,
  type,
}: {
  status?: string | null;
  type?: string | null;
}) => {
  const isDelivery = norm(type) === 'delivery';
  const steps = isDelivery
    ? ([
        { key: 'pending', icon: ChefHat },
        { key: 'ready', icon: CheckCircle2 },
        { key: 'out_for_delivery', icon: Truck },
        { key: 'complete', icon: Home },
      ] as const)
    : ([
        { key: 'pending', icon: ChefHat },
        { key: 'ready', icon: CheckCircle2 },
        { key: 'complete', icon: Home },
      ] as const);

  const s = unify(status) as any;
  const currentIndex = Math.max(0, steps.findIndex((st) => st.key === s));
  const currentStep = steps[currentIndex] ?? steps[0];
  const currentColor = stepColors(currentStep.key as any);

  return (
    <div className="flex items-center gap-2 mt-2">
      {steps.map((st, idx) => {
        const active = currentIndex >= idx;
        const current = currentIndex === idx && s !== 'complete';
        return (
          <div key={st.key} className="flex items-center gap-2 flex-1">
            {/* Step Dot */}
            <div
              className={[
                'w-6 h-6 rounded-full flex items-center justify-center border transition-colors duration-500',
                active ? currentColor.dot : 'bg-gray-100 text-gray-400 border-gray-300',
                current ? 'animate-pulse' : '',
              ].join(' ')}
            >
              <st.icon size={14} />
            </div>

            {/* Connector (skip last) */}
            {idx < steps.length - 1 && (
              <div className="relative h-1 flex-1 rounded bg-gray-300 overflow-hidden">
                {/* Completed connector: fill with current status color */}
                {currentIndex > idx && (
                  <div
                    className={[
                      'absolute left-0 top-0 h-full w-full rounded',
                      currentColor.bar, // use current step’s color
                    ].join(' ')}
                  />
                )}

                {/* Active connector: shimmer using current status color */}
                {current && (
                  <div
                    className={[
                      'absolute left-0 top-0 h-full w-full rounded',
                      currentColor.bar,
                    ].join(' ')}
                  >
                    <div className="absolute inset-0 progress-shimmer" />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};


  // Add: fetch orders with items (and attach menu names + stall names if available)
  const fetchOrdersWithItems = async () => {
    if (!authId) return;
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      // 1) Orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', authId)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;
      const orderList = ordersData ?? [];
      const orderIds = orderList.map((o: any) => o.id);

      // 2) Order items
      let itemsData: any[] = [];
      if (orderIds.length) {
        const { data: items, error: itemsErr } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        if (itemsErr) throw itemsErr;
        itemsData = items ?? [];
      }

      // 3) Menu item names/images (try menu_items, fallback to menus)
      const menuIds = Array.from(new Set(itemsData.map((i: any) => i.menu_item_id).filter(Boolean)));
      const menuMap: Record<string, { name?: string; image_url?: string }> = {};
      if (menuIds.length) {
        // Try menu_items
        const tryMenuItems = await supabase
          .from('menu_items')
          .select('id,name,image_url')
          .in('id', menuIds);
        if (!tryMenuItems.error && tryMenuItems.data) {
          tryMenuItems.data.forEach((m: any) => {
            menuMap[m.id] = { name: m.name, image_url: m.image_url };
          });
        } else {
          // Fallback to menus
          const tryMenus = await supabase
            .from('menus')
            .select('id,name,image_url')
            .in('id', menuIds);
          if (!tryMenus.error && tryMenus.data) {
            tryMenus.data.forEach((m: any) => {
              menuMap[m.id] = { name: m.name, image_url: m.image_url };
            });
          }
        }
      }

      // 4) Stall names
      const stallIds = Array.from(new Set(orderList.map((o: any) => o.stall_id).filter(Boolean)));
      const stallMap: Record<string, { name?: string }> = {};
      if (stallIds.length) {
        // Try singular table `stall` with `stallname`
        const tryStall = await supabase
          .from('stall')
          .select('id,stallname')
          .in('id', stallIds as string[]);

        let stallRows: any[] = [];
        if (!tryStall.error && tryStall.data) {
          stallRows = tryStall.data;
        } else {
          // Fallback: plural `stalls` in case your table is named differently
          const tryStalls = await supabase
            .from('stalls')
            .select('id,stallname,name')
            .in('id', stallIds as string[]);
          if (!tryStalls.error && tryStalls.data) {
            stallRows = tryStalls.data;
          }
        }

        stallRows.forEach((s: any) => {
          stallMap[s.id] = { name: s.stallname ?? s.name ?? '' };
        });
      }

      // 5) Group items by order_id and hydrate
      const itemsByOrder: Record<string, OrderItem[]> = {};
      itemsData.forEach((it: any) => {
        (itemsByOrder[it.order_id] ||= []).push({
          id: it.id,
          order_id: it.order_id,
          menu_item_id: it.menu_item_id,
          quantity: it.quantity,
          price: Number(it.price ?? 0),
          special_instructions: it.special_instructions,
          menu_item: menuMap[it.menu_item_id] ? { ...menuMap[it.menu_item_id] } : null,
        });
      });

      const hydrated: Order[] = orderList.map((o: any) => ({
        id: o.id,
        customer_id: o.customer_id,
        status: o.status,
        delivery_type: o.delivery_type,
        delivery_address: o.delivery_address,
        subtotal: o.subtotal !== null ? Number(o.subtotal) : 0,
        notes_to_driver: o.notes_to_driver,
        estimated_delivery_time: o.estimated_delivery_time,
        created_at: o.created_at,
        completed_at: o.completed_at,
        stall_id: o.stall_id,
        driver_id: o.driver_id,
        order_items: itemsByOrder[o.id] ?? [],
        stall: o.stall_id ? { name: stallMap[o.stall_id]?.name } : null,
      }));

      setOrders(hydrated);
    } catch (e: any) {
      console.error('Failed to load orders:', e);
      setOrdersError(e?.message ?? 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load orders when the popup opens
  useEffect(() => {
    if (showOrdersPopup) {
      fetchOrdersWithItems();
    }
  }, [showOrdersPopup, authId]);

  const toNumber = (v: string | number | undefined | null) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const handleEditSave = async () => {
    if (!authId) return alert('No user id available.');
    const payload: any = {
      updated_at: new Date().toISOString(),
      full_name: editData.full_name ?? null,
      phone: editData.phone ?? null,
      hostel_address: editData.hostel_address ?? null,
      profile_image: editData.profile_image ?? null,
    };
    const { error } = await supabase.from('profiles').update(payload).eq('id', authId);
    if (error) alert('Failed to update information.');
    else {
      alert('Profile updated.');
      setShowEditPopup(false);
      fetchProfile(authId);
    }
  };

  const handleTopupConfirm = async () => {
    if (!authId) return alert('No user id available.');
    const amount = typeof topupAmount === 'string' ? Number(topupAmount) : topupAmount;
    if (!amount || amount <= 0) return alert('Invalid top-up amount.');
    const current = toNumber(profile?.credit_balance);
    const newBalance = current + amount;
    const { error } = await supabase
      .from('profiles')
      .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', authId);
    if (error) {
  console.error('Supabase error:', error);
  alert('Top-up failed: ' + error.message);
}
    else {
    setShowTopupSuccess(true);      
    setShowWalletPopup(false);
      setTopupAmount('');
      fetchProfile(authId);
    }
  };

  const showOrDash = (v: any) => (v ? v : '-');

  // === Search & filter for cafes ===
  const [search, setSearch] = useState('');
  const filteredCafes = cafes.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location?.toLowerCase().includes(q) ?? false) ||
      (c.description?.toLowerCase().includes(q) ?? false)
    );
  });


if (checkoutData)
  return (
    <Checkout
      selectedStall={checkoutData.stall}
      items={checkoutData.items.map((i) => ({
        id: i.id,
        name: i.menu.name,
        quantity: i.quantity,
        price: i.menu.price,
        image_url: i.menu.image_url,
        // pass the cart "instruction" through to Checkout
        instruction: i.instruction ?? i.special_instructions ?? null,
        menu: i.menu.id,
      }))}
      total={checkoutData.total}
      onBack={() => setCheckoutData(null)}
      onConfirm={() => {
        setCheckoutData(null);
        setShowCart(false);
        setSelectedCafe(null);
        if (authId) {
          // Refresh profile to show latest credit balance after checkout
          fetchProfile(authId);
        }
      }}
    />
  );

if (showCart)
  return (
    <Cart
      onBack={() => setShowCart(false)}
      onCheckout={(stall, items, total) =>
        setCheckoutData({ stall, items, total})
      }
    />
  );

if (selectedCafe)
  return (
    <MenuList
      cafeId={selectedCafe.id}
      cafeName={selectedCafe.name}
      onBack={() => setSelectedCafe(null)}
      onViewCart={() => setShowCart(true)}
    />
  );
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ==== Main Content ==== */}
      <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto">
        {/* Hero */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow mb-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {profile?.profile_image ? (
              <img
                src={profile.profile_image}
                alt="Profile"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover ring-4 ring-white/20 shadow"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center text-white">
                <User size={24} className="sm:hidden" />
                <User size={28} className="hidden sm:block" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
              <p className="opacity-90 mt-1 sm:mt-2 text-xs sm:text-sm">{showOrDash(profile?.role ?? 'Student')} • Order your favorite meals from campus cafeterias.</p>
              {/* Wallet balance badge */}
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg text-xs sm:text-sm">
                <CreditCard size={14} />
                <span className="font-medium">Balance:</span>
                <span className="font-semibold">RM {toNumber(profile?.credit_balance).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <button onClick={() => setShowOrdersPopup(true)} className="group bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow transition text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50 text-yellow-700"><History size={18} /></div>
              <div>
                <div className="font-medium text-gray-800">Orders</div>
                <div className="text-xs text-gray-500">Track history</div>
              </div>
            </div>
          </button>
          <button onClick={() => setShowCart(true)} className="group bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow transition text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700"><ShoppingCart size={18} /></div>
              <div>
                <div className="font-medium text-gray-800">Cart</div>
                <div className="text-xs text-gray-500">Review items</div>
              </div>
            </div>
          </button>
          <button onClick={() => setShowWalletPopup(true)} className="group bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow transition text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-700"><CreditCard size={18} /></div>
              <div>
                <div className="font-medium text-gray-800">Wallet</div>
                <div className="text-xs text-gray-500">Top-up balance</div>
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              setEditData({
                full_name: profile?.full_name ?? '',
                phone: profile?.phone ?? '',
                hostel_address: profile?.hostel_address ?? '',
                profile_image: profile?.profile_image ?? '',
              });
              setShowEditPopup(true);
            }}
            className="group bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm hover:shadow transition text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700"><Edit3 size={18} /></div>
              <div>
                <div className="font-medium text-gray-800">Profile</div>
                <div className="text-xs text-gray-500">Edit details</div>
              </div>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cafeterias, locations, dishes..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {search && (
            <div className="mt-2 text-xs text-gray-500">
              Showing {filteredCafes.length} result{filteredCafes.length === 1 ? '' : 's'} for "{search}"
              <button className="ml-2 underline" onClick={() => setSearch('')}>Clear</button>
            </div>
          )}
        </div>

        {/* Cafes Section */}
        <section>
          {cafesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <div className="h-40 bg-gray-200 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                    <div className="h-9 bg-gray-200 rounded mt-3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : cafesError ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-2">{cafesError}</p>
              <button onClick={fetchCafes} className="px-4 py-2 border rounded hover:bg-gray-50">Retry</button>
            </div>
          ) : filteredCafes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCafes.map((cafe) => (
                <div
                  key={cafe.id}
                  onClick={() => setSelectedCafe(cafe)}
                  className="group border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition bg-white cursor-pointer"
                >
                  <div className="h-40 bg-gray-100 relative">
                    {cafe.image_url ? (
                      <img
                        src={cafe.image_url}
                        alt={cafe.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                        <MapPin className="h-12 w-12" />
                      </div>
                    )}
                    {/* gradient overlay for readability */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-lg">{cafe.name}</h3>
                    <div className="flex items-center text-gray-600 text-sm mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{showOrDash(cafe.location)}</span>
                    </div>
                    {cafe.operating_hours && (
                      <div className="flex items-center text-gray-600 text-sm mt-1">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{cafe.operating_hours}</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {cafe.description || 'No description available.'}
                    </p>
                    <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                      Order Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              <div className="text-lg font-medium mb-2">No cafeterias found</div>
              <p className="text-sm mb-4">Try a different search or clear the filter.</p>
              {search && (
                <button onClick={() => setSearch('')} className="px-4 py-2 border rounded hover:bg-gray-50">Clear search</button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* ==== Edit Info Popup ==== */}
 {showEditPopup && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl mx-4">
      <h3 className="text-2xl font-semibold text-gray-800 mb-5 text-center">
        Edit Profile Information
      </h3>

      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <input
            type="text"
            placeholder="Full Name"
            value={editData.full_name ?? ''}
            onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="text"
            placeholder="Phone"
            value={editData.phone ?? ''}
            onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Address */}
        <div>
          <label className="text-sm font-medium text-gray-700">Hostel Address</label>
          <input
            type="text"
            placeholder="Hostel Address"
            value={editData.hostel_address ?? ''}
            onChange={(e) => setEditData((p) => ({ ...p, hostel_address: e.target.value }))}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Profile Image Upload */}
        <div>
          <label className="text-sm font-medium text-gray-700">Profile Image</label>

          {/* Dropzone / Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  setEditData((p) => ({ ...p, profile_image: reader.result as string }));
                };
                reader.readAsDataURL(file);
              }
            }}
            className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition"
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setEditData((p) => ({ ...p, profile_image: reader.result as string }));
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
              id="fileUpload"
            />
            <label htmlFor="fileUpload" className="block text-sm text-gray-600 cursor-pointer">
              Drag & drop image here or <span className="text-blue-600 font-medium">click to upload</span>
            </label>
          </div>

          {/* Preview */}
          {editData.profile_image && (
            <div className="flex justify-center mt-3">
              <img
                src={editData.profile_image}
                alt="Profile Preview"
                className="w-24 h-24 rounded-full object-cover border-2 border-blue-200 shadow-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => setShowEditPopup(false)}
          className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleEditSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}


      {/* ==== Wallet Popup ==== */}
      {showWalletPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white w-full max-w-sm p-6 rounded-lg shadow-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">Wallet Top-Up</h3>
            <div className="flex gap-2 mb-3">
              {[10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt)}
                  className={`flex-1 py-2 border rounded ${
                    topupAmount === amt ? 'bg-green-100 border-green-500' : ''
                  }`}
                >
                  RM{amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Custom amount (RM)"
              value={topupAmount === '' ? '' : String(topupAmount)}
              onChange={(e) =>
                setTopupAmount(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <p className="text-sm text-gray-600 mb-4">
              Current balance: RM {toNumber(profile?.credit_balance).toFixed(2)}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowWalletPopup(false)} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={handleTopupConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Top-up Successful Popup */}
      {showTopupSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 shadow-lg w-80 max-w-full mx-4 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-green-500 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h2 className="text-lg font-semibold mb-2">Top-up Successful!</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your wallet has been credited successfully 🎉
            </p>
            <button
              onClick={() => setShowTopupSuccess(false)}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ✅ Order History Popup */}
      {showOrdersPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl h-[85vh] sm:h-auto max-h-[90vh] rounded-xl shadow-xl overflow-hidden flex flex-col mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <History className="text-yellow-600" size={20} />
                <h3 className="font-semibold text-gray-800">Order History</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchOrdersWithItems}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                  title="Refresh"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowOrdersPopup(false)}
                  className="p-2 rounded hover:bg-gray-100"
                  aria-label="Close"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-5">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Loading orders...
                </div>
              ) : ordersError ? (
                <div className="text-center text-red-600 py-10">{ordersError}</div>
              ) : !orders.length ? (
                <div className="text-center text-gray-600 py-10">No orders found.</div>
              ) : (
                <div className="space-y-8">
                  {/* ==== Active Orders ==== */}
                  {orders.some((o) => isActiveOrder(o.status)) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Active Orders</h4>
                      <div className="space-y-4">
                        {orders
                          .filter((o) => isActiveOrder(o.status))
                          .map((order) => (
                            <div key={order.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">
                                    {order.stall?.name || 'Order'} • {order.id.slice(0, 8)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDateTime(order.created_at)}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${statusBadgeCls(order.status)}`}>
                                  {statusMessage(order.status)}
                                </span>
                              </div>
 
                              <div className="p-4 space-y-3">
                                 {/* Status progress like image */}
                                 <div>
                                   <ProgressBar status={order.status} type={order.delivery_type} />
                                 </div>

                                {/* Delivery info */}
                                <div className="text-sm text-gray-600 pt-2">
                                  <div className="flex gap-2">
                                    <span className="font-medium text-gray-700 min-w-28">Type:</span>
                                    <span className="uppercase">{order.delivery_type || '-'}</span>
                                  </div>
                                  {order.delivery_type?.toLowerCase() === 'delivery' && (
                                    <div className="flex gap-2">
                                      <span className="font-medium text-gray-700 min-w-28">Address:</span>
                                      <span>{order.delivery_address || '-'}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Items */}
                                <div className="border-t pt-3">
                                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Items</h4>
                                  <div className="space-y-2">
                                    {(order.order_items || []).map((it) => (
                                      <div key={it.id} className="flex items-center gap-3">
                                        {it.menu_item?.image_url ? (
                                          <img src={it.menu_item.image_url} alt={it.menu_item?.name || 'Item'} className="w-12 h-12 rounded object-cover" />
                                        ) : (
                                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">IMG</div>
                                        )}
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800">
                                            {it.menu_item?.name || `Item ${it.menu_item_id.slice(0, 6)}`}
                                          </div>
                                          {it.special_instructions && (
                                            <div className="text-xs text-gray-500">Note: {it.special_instructions}</div>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-700">x{it.quantity}</div>
                                        <div className="text-sm font-medium text-gray-800 w-24 text-right">
                                          {formatCurrency((it.price || 0) * (it.quantity || 0))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Totals */}
                                <div className="border-t pt-3 flex justify-end">
                                  <div className="text-sm space-y-1">
                                    {(() => {
                                      const itemsSubtotal =
                                        order.subtotal ??
                                        (order.order_items || []).reduce(
                                          (s, i) => s + (i.price || 0) * (i.quantity || 0),
                                          0
                                        );
                                      const isDelivery =
                                        (order.delivery_type || '').toLowerCase() === 'delivery';
                                      const deliveryFee = isDelivery ? 3 : 0;
                                      const finalSubtotal = Number(itemsSubtotal || 0) + deliveryFee;
                                      return (
                                        <>
                                          <div className="flex justify-between gap-6">
                                            <span className="text-gray-600">Items Subtotal:</span>
                                            <span className="font-semibold">{formatCurrency(itemsSubtotal)}</span>
                                          </div>
                                          {isDelivery && (
                                            <div className="flex justify-between gap-6">
                                              <span className="text-gray-600">Delivery Fee:</span>
                                              <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between gap-6 border-t pt-2">
                                            <span className="text-gray-800 font-medium">Subtotal:</span>
                                            <span className="font-bold">{formatCurrency(finalSubtotal)}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* ==== Past Orders (Completed) ==== */}
                  {orders.some((o) => isCompleted(o.status)) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-3">Past Orders</h4>
                      <div className="space-y-4">
                        {orders
                          .filter((o) => isCompleted(o.status))
                          .map((order) => (
                            <div key={order.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-800">
                                    {order.stall?.name || 'Order'} • {order.id.slice(0, 8)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDateTime(order.created_at)}
                                  </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${statusBadgeCls(order.status)}`}>
                                  {statusMessage(order.status)}
                                </span>
                              </div>

                              <div className="p-4 space-y-3">
                                {/* Items */}
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Items</h4>
                                  <div className="space-y-2">
                                    {(order.order_items || []).map((it) => (
                                      <div key={it.id} className="flex items-center gap-3">
                                        {it.menu_item?.image_url ? (
                                          <img src={it.menu_item.image_url} alt={it.menu_item?.name || 'Item'} className="w-12 h-12 rounded object-cover" />
                                        ) : (
                                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">IMG</div>
                                        )}
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800">
                                            {it.menu_item?.name || `Item ${it.menu_item_id.slice(0, 6)}`}
                                          </div>
                                          {it.special_instructions && (
                                            <div className="text-xs text-gray-500">Note: {it.special_instructions}</div>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-700">x{it.quantity}</div>
                                        <div className="text-sm font-medium text-gray-800 w-24 text-right">
                                          {formatCurrency((it.price || 0) * (it.quantity || 0))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Totals */}
                                <div className="border-t pt-3 flex justify-end">
                                  <div className="text-sm space-y-1">
                                    {(() => {
                                      const itemsSubtotal =
                                        order.subtotal ??
                                        (order.order_items || []).reduce(
                                          (s, i) => s + (i.price || 0) * (i.quantity || 0),
                                          0
                                        );
                                      const isDelivery =
                                        (order.delivery_type || '').toLowerCase() === 'delivery';
                                      const deliveryFee = isDelivery ? 3 : 0;
                                      const finalSubtotal = Number(itemsSubtotal || 0) + deliveryFee;
                                      return (
                                        <>
                                          <div className="flex justify-between gap-6">
                                            <span className="text-gray-600">Items Subtotal:</span>
                                            <span className="font-semibold">{formatCurrency(itemsSubtotal)}</span>
                                          </div>
                                          {isDelivery && (
                                            <div className="flex justify-between gap-6">
                                              <span className="text-gray-600">Delivery Fee:</span>
                                              <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
                                            </div>
                                          )}
                                          <div className="flex justify-between gap-6 border-t pt-2">
                                            <span className="text-gray-800 font-medium">Subtotal:</span>
                                            <span className="font-bold">{formatCurrency(finalSubtotal)}</span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                 </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowOrdersPopup(false)}
                className="px-4 py-2 border rounded hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;