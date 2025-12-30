import { useState, useEffect, useMemo } from 'react';
import { supabase, Order } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, ShoppingBag, Search, 
  ArrowUpNarrowWide, ArrowDownWideNarrow, X, Filter, Truck 
} from 'lucide-react'; // Added Filter and X icons

const STATUS_OPTIONS = ['all', 'pending', 'ready', 'out_for_delivery', 'completed'];
const DELIVERY_TYPE_OPTIONS = ['all', 'delivery', 'pickup'];
const OrderRow = ({ order, getStatusColor }: { order: Order, getStatusColor: (status: string) => string }) => {
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900">
            Order #{order.order_number || order.id.substring(0, 8)}
          </h3>
          <p className="text-xs text-gray-500">
            {new Date(order.created_at).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short' 
            })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
          
          <div className={`flex items-center gap-1 text-xs font-medium ${
            order.delivery_type === 'delivery' ? 'text-blue-600' : 'text-purple-600'
          }`}>
            {order.delivery_type === 'delivery' ? 
              <Truck className="h-3 w-3" /> : 
              <ShoppingBag className="h-3 w-3" />
            }
            <span className="capitalize">{order.delivery_type}</span>
          </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-3 space-y-2">
        {order.order_items.map(item => (
          <div key={item.id} className="text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">
                {item.quantity}x {item.menu_items?.name || 'Menu Item'}
              </span>
              <span className="text-gray-700">RM {item.price.toFixed(2)}</span>
            </div>
            {item.special_instructions && (
              <p className="text-xs text-gray-500 italic ml-4">
                - {item.special_instructions}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 pt-2 text-right">
        <span className="font-bold text-lg text-gray-900">
          Total: RM {(order.subtotal ?? 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export function AllOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]); // This will hold ALL orders
  const [loading, setLoading] = useState(true);
  
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter'); 
  const [pendingTab, setPendingTab] = useState<'delivery' | 'pickup'>('delivery');

  // --- NEW STATE FOR FILTERS AND SORTING ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [priceSort, setPriceSort] = useState<SortDirection>('none');
  const [timeSort, setTimeSort] = useState<TimeSort>('newest');
  
  type SortDirection = 'none' | 'asc' | 'desc';
  type TimeSort = 'newest' | 'oldest';
  // --- END NEW STATE ---

  useEffect(() => {
    if (profile) {
      fetchOrders();
    }
  }, [profile]);

  const fetchOrders = async () => {
    setLoading(true);
    if (!profile) return;

    const { data: stallData } = await supabase
      .from('stall')
      .select('id')
      .eq('vendorid', profile.id)
      .single();

    if (stallData) {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            special_instructions,
            menu_items ( name )
          )
        `)
        .eq('stall_id', stallData.id)
        .order('created_at', { ascending: false }); // Always get newest first

      if (error) {
        console.error("Error fetching all orders:", error);
      } else {
        setOrders(ordersData as any[]);
      }
    }
    setLoading(false);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- NEW MEMOS FOR PENDING PAGE ---
  const pendingDeliveryOrders = useMemo(() => {
    return orders
      .filter(o => o.delivery_type === 'delivery' && ['pending', 'preparing'].includes(o.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // oldest first
  }, [orders]);

  const pendingPickupOrders = useMemo(() => {
    return orders
      .filter(o => o.delivery_type === 'pickup' && ['pending', 'preparing', 'ready'].includes(o.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // oldest first
  }, [orders]);

  // --- UPDATED useMemo TO HANDLE ALL FILTERS ---
  const filteredOrders = useMemo(() => {
    let tempOrders = [...orders];
    const today = new Date().toLocaleDateString('en-CA');
    const searchTermLower = searchTerm.toLowerCase();
    
    // 1. Apply the main URL filter (from dashboard click)
    if (filter === 'pending') {
      tempOrders = tempOrders
        .filter(o => ['pending', 'preparing'].includes(o.status))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (filter === 'today') {
      tempOrders = tempOrders.filter(o => {
        if (!o.created_at) return false;
        return new Date(o.created_at).toLocaleDateString('en-CA') === today;
      });
    }

    // 2. Apply search term (if not on pending tab)
    if (filter !== 'pending' && searchTermLower) {
      tempOrders = tempOrders.filter(order =>
        (order.order_number || order.id).toLowerCase().includes(searchTermLower) ||
        order.order_items.some(item => 
          item.menu_items?.name.toLowerCase().includes(searchTermLower)
        )
      );
    }
    
    // 3. Apply manual filters (if not on pending tab)
    if (filter !== 'pending') {
      
      // ADDED: Status Filter
      if (statusFilter !== 'all') {
        tempOrders = tempOrders.filter(o => o.status === statusFilter);
      }

      if (deliveryTypeFilter !== 'all') {
        tempOrders = tempOrders.filter(o => o.delivery_type === deliveryTypeFilter);
      }
      
      // Date Range (Only for "Total Orders" tab)
      if (!filter) { 
        if (dateStart) {
          const startDate = new Date(dateStart);
          startDate.setHours(0, 0, 0, 0);
          tempOrders = tempOrders.filter(o => new Date(o.created_at) >= startDate);
        }
        if (dateEnd) {
          const endDate = new Date(dateEnd);
          endDate.setHours(23, 59, 59, 999);
          tempOrders = tempOrders.filter(o => new Date(o.created_at) <= endDate);
        }
      }
    }

    // 4. Apply sorting
    if (priceSort !== 'none') {
      tempOrders.sort((a, b) => {
        const priceA = a.subtotal ?? 0;
        const priceB = b.subtotal ?? 0;
        return priceSort === 'asc' ? priceA - priceB : priceB - priceA;
      });
    } else if (timeSort !== 'newest') { // Apply time sort if not newest
      tempOrders.sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeSort === 'oldest' ? timeA - timeB : timeB - timeA;
      });
    }
    
    return tempOrders;

  }, [orders, searchTerm, filter, statusFilter, deliveryTypeFilter, priceSort, timeSort, dateStart, dateEnd]); // Added statusFilter

  const groupedOrders = useMemo(() => {
    // If we are sorting by price, don't group!
    // Return null to signal we should render a flat list.
    if (priceSort !== 'none') {
      return null;
    }

    const grouper = new Map<string, Order[]>();
    for (const order of filteredOrders) {
      // Get a human-readable date string
      const dateString = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }); // e.g., "November 7, 2025"

      if (!grouper.has(dateString)) {
        grouper.set(dateString, []);
      }
      grouper.get(dateString)!.push(order);
    }
    return grouper;
    
  }, [filteredOrders, priceSort]);
  
  // Clear all manual filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDeliveryTypeFilter('all');
    setPriceSort('none');
    setTimeSort('newest');
    setDateStart('');
    setDateEnd('');
  };
  
  const title = filter === 'pending' 
    ? "All Pending Orders" 
    : filter === 'today' 
    ? "All Today's Orders" 
    : "All Orders";
  
  // Helper to toggle price sort
  const togglePriceSort = () => {
    setTimeSort('newest'); // Reset time sort
    if (priceSort === 'none') setPriceSort('asc');
    else if (priceSort === 'asc') setPriceSort('desc');
    else setPriceSort('none');
  };

  // Helper to toggle time sort
  const toggleTimeSort = () => {
    setPriceSort('none'); // Reset price sort
    setTimeSort(prev => prev === 'newest' ? 'oldest' : 'newest');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link to="/vendor/dashboard" className="flex items-center gap-2 text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>

      {/* --- THIS IS THE CORRECTED LOGIC --- */}

      {filter === 'pending' ? (
        
        // 1. UI FOR "PENDING" PAGE (filter === 'pending')
        <div className="space-y-4">
          <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setPendingTab('delivery')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                pendingTab === 'delivery' ? 'bg-white shadow' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              For Delivery ({pendingDeliveryOrders.length})
            </button>
            <button
              onClick={() => setPendingTab('pickup')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                pendingTab === 'pickup' ? 'bg-white shadow' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              For Pickup ({pendingPickupOrders.length})
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : (
              <>
                {pendingTab === 'delivery' && (
                  pendingDeliveryOrders.length === 0 ? (
                    <div className="text-center py-16 text-gray-600">
                      <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="font-medium">No pending delivery orders.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {pendingDeliveryOrders.map(order => (
                        <OrderRow key={order.id} order={order} getStatusColor={getStatusColor} />
                      ))}
                    </div>
                  )
                )}
                {pendingTab === 'pickup' && (
                  pendingPickupOrders.length === 0 ? (
                    <div className="text-center py-16 text-gray-600">
                      <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <p className="font-medium">No pending pickup orders.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {pendingPickupOrders.map(order => (
                        <OrderRow key={order.id} order={order} getStatusColor={getStatusColor} />
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        </div>

      ) : (

        // 2. UI FOR "TODAY" & "ALL" PAGES (filter !== 'pending')
        <div className="space-y-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </div>

          {/* Filter Bar JSX */}
          <div className="flex flex-wrap items-end gap-4">
            
            {/* Search (takes up most space) */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Order # or item name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status} className="capitalize">{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={deliveryTypeFilter}
                onChange={(e) => setDeliveryTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                {DELIVERY_TYPE_OPTIONS.map(type => (
                  <option key={type} value={type} className="capitalize">{type}</option>
                ))}
              </select>
            </div>

            {/* Price Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <button
                onClick={togglePriceSort}
                className={`flex items-center justify-center gap-1 py-2 px-4 border rounded-lg w-24 ${
                  priceSort !== 'none' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white'
                }`}
              >
                <span>Price</span>
                {priceSort === 'asc' && <ArrowUpNarrowWide className="h-4 w-4" />}
                {priceSort === 'desc' && <ArrowDownWideNarrow className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Time Sort (conditional) */}
            {(filter === 'today' || !filter) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label> {/* Placeholder label for alignment */}
                <button
                  onClick={toggleTimeSort}
                  className={`flex items-center justify-center gap-1 py-2 px-4 border rounded-lg w-24 ${
                    timeSort === 'oldest' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white'
                  }`}
                >
                  <span>Time</span>
                  {timeSort === 'oldest' && <ArrowUpNarrowWide className="h-4 w-4" />}
                  {timeSort === 'newest' && <ArrowDownWideNarrow className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Date Range (Only for "Total Orders" tab) */}
          {!filter && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4"> {/* Added padding-top */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Clear Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <X className="h-4 w-4" />
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : filter === 'pending' ? (
          // This block is now handled by the UI above, but we need to show the list
          // This part is now redundant, but we'll leave the list logic
          <></> // The list is *inside* the "pending" UI block now
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="font-medium">No orders found for this filter.</p>
          </div>
        ) : groupedOrders ? (
          // Grouped View (default)
          Array.from(groupedOrders.entries()).map(([dateString, ordersForDay]) => (
            <section key={dateString}>
              <h2 className="text-base font-semibold text-gray-800 p-3 bg-gray-50 border-b border-t border-gray-200 sticky top-0 z-10">
                {dateString}
              </h2>
              <div className="divide-y divide-gray-200">
                {ordersForDay.map(order => (
                  <OrderRow key={order.id} order={order} getStatusColor={getStatusColor} />
                ))}
              </div>
            </section>
          ))
        ) : (
          // Flat List View (when sorting by price)
          <div className="divide-y divide-gray-200">
            {filteredOrders.map(order => (
                <OrderRow key={order.id} order={order} getStatusColor={getStatusColor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}