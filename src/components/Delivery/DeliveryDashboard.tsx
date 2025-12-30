import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bike, Package, CheckCircle, Clock, MapPin, ArrowRightCircle, Moon, Sun, ChevronDown } from 'lucide-react';
import { mockDeliveries } from './mockData';
import { supabase } from '../../lib/supabase';
import DeliveryMap from './DeliveryMap';

type StaticLocation = {
  keywords: string[];
  lat: number;
  lng: number;
  label: string;
  address?: string;
};

const STATIC_VENDOR_LOCATIONS: StaticLocation[] = [
  {
    keywords: ['uncle hooi'],
    lat: 5.3565,
    lng: 100.3025,
    label: 'Uncle Hooi Stall',
    address: 'Desasiswa Restu Food Court'
  },
  {
    keywords: ['restu'],
    lat: 5.3565,
    lng: 100.3025,
    label: 'Desasiswa Restu'
  },
  {
    keywords: ['pelita'],
    lat: 5.3549,
    lng: 100.3020,
    label: 'Pelita Nasi Kandar Sungai Dua',
    address: 'Sungai Dua, near USM'
  }
];

const STATIC_CUSTOMER_LOCATIONS: StaticLocation[] = [
  {
    keywords: ['indah kembara', 'ik', 'ik hostel', 'ik residence', 'ik block'],
    lat: 5.357,
    lng: 100.301,
    label: 'Indah Kembara'
  },
  {
    keywords: ['restu'],
    lat: 5.3565,
    lng: 100.3025,
    label: 'Desasiswa Restu'
  },
  {
    keywords: ['pelita'],
    lat: 5.3549,
    lng: 100.3020,
    label: 'Pelita Sungai Dua'
  },
  {
    keywords: ['aman damai', 'aman', 'aman damai 14000', 'aman damai residence'],
    lat: 5.3535,
    lng: 100.298,
    label: 'Aman Damai',
    address: 'Aman Damai Residence, USM'
  }
  ,
  {
    keywords: ['desasiswa aman damai', 'aman damai', 'aman'],
    lat: 5.3576,
    lng: 100.2952,
    label: 'Desasiswa Aman Damai'
  },
  {
    keywords: ['desasiswa bakti permai', 'bakti permai', 'bakti'],
    lat: 5.3572,
    lng: 100.2937,
    label: 'Desasiswa Bakti Permai'
  },
  {
    keywords: ['desasiswa cahaya gemilang', 'cahaya gemilang', 'gemilang'],
    lat: 5.3579,
    lng: 100.2932,
    label: 'Desasiswa Cahaya Gemilang'
  },
  {
    keywords: ['desasiswa fajar harapan', 'fajar harapan', 'fajar'],
    lat: 5.3557,
    lng: 100.2937,
    label: 'Desasiswa Fajar Harapan'
  },
  {
    keywords: ['desasiswa indah kembara', 'indah kembara', 'kembara'],
    lat: 5.3552,
    lng: 100.2957,
    label: 'Desasiswa Indah Kembara'
  },
  {
    keywords: ['desasiswa restu', 'restu'],
    lat: 5.3570,
    lng: 100.2957,
    label: 'Desasiswa Restu'
  },
  {
    keywords: ['desasiswa saujana', 'saujana'],
    lat: 5.3562,
    lng: 100.2947,
    label: 'Desasiswa Saujana'
  },
  {
    keywords: ['desasiswa tekun', 'tekun'],
    lat: 5.3567,
    lng: 100.2962,
    label: 'Desasiswa Tekun'
  },
  {
    keywords: ['international house usm', 'international house', 'ih', 'ih usm'],
    lat: 5.3537,
    lng: 100.2952,
    label: 'International House USM'
  }
];

const tokenizeAddress = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const matchStaticLocation = (text: string, locations: StaticLocation[]): StaticLocation | null => {
  const tokensArray = tokenizeAddress(text);
  if (!tokensArray.length) return null;
  const tokensSet = new Set(tokensArray);

  const matchesToken = (needle: string) => {
    return tokensArray.some((candidate) => {
      if (candidate === needle) return true;
      if (needle.length >= 3 && candidate.includes(needle)) return true;
      if (needle.length <= 2 && candidate.startsWith(needle)) return true;
      return false;
    });
  };

  return (
    locations.find((loc) =>
      loc.keywords.some((keyword) => {
        const keywordTokens = tokenizeAddress(keyword);
        if (!keywordTokens.length) return false;
        return keywordTokens.every((token) => tokensSet.has(token) || matchesToken(token));
      })
    ) || null
  );
};

const resolveVendorLocation = (vendorName: string): StaticLocation | null => {
  if (!vendorName) return null;
  return matchStaticLocation(vendorName, STATIC_VENDOR_LOCATIONS);
};

const resolveCustomerLocation = (address: string): StaticLocation | null => {
  if (!address) return null;
  return matchStaticLocation(address, STATIC_CUSTOMER_LOCATIONS);
};

const computeStats = (rows: DeliveryWithOrder[]) => {
  const today = new Date().toISOString().split('T')[0];

  const assigned = rows.filter((d) => d.status === 'assigned').length;
  const inProgress = rows.filter((d) => ['picked_up', 'en_route'].includes(d.status)).length;
  const completedToday = rows.filter(
    (d) => d.status === 'delivered' && (d.delivery_time || '').startsWith(today)
  ).length;

  return {
    assigned,
    inProgress,
    completed: completedToday,
    todayEarnings: completedToday * 3
  };
};

export interface DeliveryWithOrder {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pickup_time: string | null;
  delivery_time: string | null;
  current_location: { lat: number; lng: number } | null;
  last_location_update: string | null;
  status_history: Array<{
    status: string;
    timestamp: string;
    previous_status: string | null;
  }>;
  order: {
    order_number: string;
    delivery_address: string;
    vendor_name: string;
    vendor_location: {
      lat: number;
      lng: number;
      name: string;
      address: string;
    } | null;
    customer_location?: {
      lat: number;
      lng: number;
    } | null;
      payment_method?: string;
      notes?: string;
      items?: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    customer: {
      full_name: string;
      phone: string;
    };
  };
}

interface UpdateStatusModalProps {
  delivery: DeliveryWithOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (status: string) => Promise<void>;
}

interface TrackingModalProps {
  delivery: DeliveryWithOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'assigned':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'picked_up':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'en_route':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

const TrackingModal = ({ delivery, isOpen, onClose }: TrackingModalProps) => {
  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 max-w-full sm:max-w-xl w-full mx-2 sm:mx-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold dark:text-white">Delivery Locations</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="font-medium dark:text-white">Order: {delivery.order.order_number}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Status: {delivery.status.replace('_', ' ')}</p>
        </div>

        {delivery.order.vendor_location && delivery.order.customer_location && (
          <>
            <DeliveryMap
              vendorLocation={delivery.order.vendor_location}
              customerLocation={delivery.order.customer_location}
              currentLocation={delivery.current_location}
            />

            <div className="mt-4 space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <p className="text-sm font-medium dark:text-white">Pickup: {delivery.order.vendor_location.name}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <p className="text-sm font-medium dark:text-white">Deliver to: {delivery.order.delivery_address}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const DeliveryDetailModal = ({ delivery, isOpen, onClose, onUpdateStatus, onOpenMap, onAccept }: {
  delivery: DeliveryWithOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (status: string) => Promise<void>;
  onOpenMap: () => void;
  onAccept?: () => Promise<void>;
}) => {
  if (!isOpen || !delivery) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 max-w-full sm:max-w-2xl w-full mx-2 sm:mx-0 overflow-y-auto max-h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold dark:text-white">Order Details — {delivery.order.order_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
            <p className="font-medium dark:text-white">{delivery.order.customer.full_name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order.customer.phone}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Delivery Address</p>
            <p className="font-medium dark:text-white">{delivery.order.delivery_address}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Vendor</p>
            <p className="font-medium dark:text-white">{delivery.order.vendor_name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order.vendor_location?.address}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Payment</p>
            <p className="font-medium dark:text-white">{delivery.order.payment_method || 'N/A'}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Notes</p>
            <p className="font-medium dark:text-white">{delivery.order.notes || '-'}</p>
          </div>
        </div>

        <div className="mb-4">
          <h4 className="font-medium dark:text-white mb-2">Items</h4>
          <div className="divide-y dark:divide-gray-700">
            {(delivery.order.items || []).map((it, i) => (
              <div key={i} className="py-2 flex justify-between">
                <div>
                  <p className="font-medium dark:text-white">{it.name} <span className="text-sm text-gray-500 dark:text-gray-400">x{it.quantity}</span></p>
                </div>
                <div className="text-gray-700 dark:text-gray-300">RM {(it.price * it.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="pt-3 text-right font-bold dark:text-white">Total: RM {Number(delivery.order.total).toFixed(2)}</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <button onClick={(e) => { e.stopPropagation(); onOpenMap(); }} className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-center">View Map</button>
          {delivery.status === 'assigned' && onAccept && (
            <button onClick={(e) => { e.stopPropagation(); onAccept(); }} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-center">Accept Order</button>
          )}
          {delivery.status !== 'delivered' && delivery.status !== 'assigned' && (
            <button onClick={(e) => { 
              e.stopPropagation(); 
              const nextStatus = delivery.status === 'picked_up' ? 'en_route' : (delivery.status === 'en_route' ? 'delivered' : delivery.status);
              onUpdateStatus(nextStatus);
            }} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-center">Advance Status</button>
          )}
          <button onClick={onClose} className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 dark:text-white px-3 py-2 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-gray-600">Close</button>
        </div>
      </div>
    </div>
  );
};

const UpdateStatusModal = ({ delivery, isOpen, onClose, onUpdateStatus }: UpdateStatusModalProps) => {
  if (!isOpen || !delivery) return null;

  const statuses = [
    { value: 'picked_up', label: 'Picked up from vendor' },
    { value: 'en_route', label: 'En route to customer' },
    { value: 'delivered', label: 'Delivered to customer' }
  ];

  const nextStatus = {
    assigned: 'picked_up',
    picked_up: 'en_route',
    en_route: 'delivered'
  }[delivery.status] as string;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 max-w-full sm:max-w-md w-full mx-2 sm:mx-0">
        <h3 className="text-xl font-bold dark:text-white mb-4">Update Delivery Status</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Order: {delivery.order.order_number}
          <br />
          Current Status: {delivery.status.replace('_', ' ')}
        </p>

        <div className="space-y-3">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => onUpdateStatus(status.value)}
              className={`w-full p-3 rounded-lg text-left ${
                status.value === nextStatus
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
              disabled={status.value !== nextStatus}
            >
              {status.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full p-3 bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export function DeliveryDashboard() {
  const { profile } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithOrder | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    completed: 0,
    todayEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [sortBy, setSortBy] = useState('newest');
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedDeliveryForTracking, setSelectedDeliveryForTracking] = useState<DeliveryWithOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const statusPriority: Record<string, number> = {
    en_route: 0,
    picked_up: 1,
    assigned: 2
  };

  const handleAcceptDelivery = async (
    delivery: DeliveryWithOrder | null,
    options: { closeDetail?: boolean } = {}
  ) => {
    if (!delivery) {
      alert('No order selected.');
      return;
    }

    if (!profile?.id) {
      alert('No rider profile detected. Please sign in again.');
      return;
    }

    try {
      setUpdating(true);
      const orderId = delivery.order_id;
      const timestamp = new Date().toISOString();

      const { error: orderErr } = await supabase
        .from('orders')
        .update({ driver_id: profile.id, status: 'out_for_delivery' })
        .eq('id', orderId);

      if (orderErr) {
        throw orderErr;
      }

      const { error: deliveryErr } = await supabase
        .from('deliveries')
        .upsert(
          [
            {
              order_id: orderId,
              rider_id: profile.id,
              status: 'picked_up',
              pickup_time: timestamp
            }
          ],
          { onConflict: 'order_id' }
        );

      if (deliveryErr) {
        throw deliveryErr;
      }

      setSelectedDelivery((prev) => {
        if (!prev || prev.id !== delivery.id) return prev;
        return {
          ...prev,
          status: 'picked_up',
          pickup_time: timestamp
        };
      });

      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === delivery.id
            ? {
                ...d,
                status: 'picked_up',
                pickup_time: timestamp
              }
            : d
        )
      );

      await fetchDeliveries();

      if (options.closeDetail) {
        setShowDetailModal(false);
      }
    } catch (e: any) {
      console.error('Accept order failed', e);
      alert(`Failed to accept order.\n\nError: ${e?.message || 'Unknown error occurred.'}`);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [profile]);

  useEffect(() => {
    setStats(computeStats(deliveries));
  }, [deliveries]);

  // Realtime subscription to deliveries table so updates are pushed to the UI
  useEffect(() => {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Realtime order change', payload);
        fetchDeliveries();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
    };
  }, [profile]);

  const fetchDeliveries = async () => {
    setLoading(true);

    try {
      // Fetch orders for delivery workflow directly
      let q = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.id) {
        q = q.or(`status.in.(pending,ready),driver_id.eq.${profile.id}`);
      } else {
        q = q.in('status', ['pending', 'ready']);
      }

      // Only include delivery-type orders for active deliveries/dashboard
      q = q.eq('delivery_type', 'delivery');

      const { data: ordersData, error: ordersErr } = await q;

      console.log('Fetched pending orders count:', (ordersData || []).length, ordersErr || '');

      if (ordersErr) {
        console.warn('Orders fetch failed', ordersErr);
      }
      const orderIds = Array.from(new Set((ordersData || []).map((o: any) => o.id)));

      let itemsByOrder = new Map<string, any[]>();
      try {
        const { data: orderItemsData, error: itemsErr } = await supabase
          .from('order_items')
          .select('*, menu_item:menu_items(id, name, price)')
          .in('order_id', orderIds);
        if (itemsErr) throw itemsErr;
        itemsByOrder = new Map<string, any[]>();
        (orderItemsData || []).forEach((it: any) => {
          if (!itemsByOrder.has(it.order_id)) itemsByOrder.set(it.order_id, []);
          itemsByOrder.get(it.order_id)!.push(it);
        });
      } catch (e) {
        console.warn('Order items fetch failed', e);
      }

      // Fetch stall information for vendor names
      const stallIds = Array.from(new Set((ordersData || []).map((o: any) => o.stall_id).filter(Boolean)));
      const stallMap: Record<string, string> = {};
      if (stallIds.length > 0) {
        try {
          const { data: stallData, error: stallErr } = await supabase
            .from('stall')
            .select('id, stallname')
            .in('id', stallIds as string[]);
          
          if (!stallErr && stallData) {
            stallData.forEach((s: any) => {
              stallMap[s.id] = s.stallname || '';
            });
          }
        } catch (e) {
          console.warn('Stall fetch failed', e);
        }
      }

      // Fetch customer information for names/phones
      const customerIds = Array.from(new Set((ordersData || []).map((o: any) => o.customer_id).filter(Boolean)));
      const customerMap: Record<string, { full_name: string; phone: string | null }> = {};
      if (customerIds.length > 0) {
        try {
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .in('id', customerIds as string[]);

          if (!profileErr && profileData) {
            profileData.forEach((p: any) => {
              customerMap[p.id] = {
                full_name: p.full_name || '',
                phone: p.phone ?? null
              };
            });
          }
        } catch (e) {
          console.warn('Customer profile fetch failed', e);
        }
      }

      const mapped = (ordersData || []).map((ord: any) => {
        const items = itemsByOrder.get(ord.id) || [];
        const vendorName = ord.stall_id ? (stallMap[ord.stall_id] || '') : '';
        const vendorStaticLocation = vendorName ? resolveVendorLocation(vendorName) : null;
        const customerStaticLocation = ord?.delivery_address ? resolveCustomerLocation(ord.delivery_address) : null;

        const statusMap: Record<string, string> = {
          pending: 'assigned',
          preparing: 'assigned',
          ready: 'assigned',
          out_for_delivery: 'en_route',
          completed: 'delivered',
          cancelled: 'cancelled'
        };
        const mappedStatus = statusMap[ord.status] || 'assigned';

        return {
          id: ord.id,
          order_id: ord.id,
          status: mappedStatus,
          created_at: ord.created_at,
          pickup_time: null,
          delivery_time: ord.completed_at,
          current_location: null,
          last_location_update: null,
          status_history: [],
          order: {
            order_number: ord?.order_number || ord.id || '',
            delivery_address: ord?.delivery_address || '',
            vendor_name: vendorName,
            vendor_location: vendorStaticLocation
              ? {
                  lat: vendorStaticLocation.lat,
                  lng: vendorStaticLocation.lng,
                  name: vendorName || vendorStaticLocation.label,
                  address: vendorStaticLocation.address || vendorName || vendorStaticLocation.label
                }
              : null,
            customer_location: customerStaticLocation
              ? {
                  lat: customerStaticLocation.lat,
                  lng: customerStaticLocation.lng,
                  name: customerStaticLocation.label,
                  address: ord?.delivery_address || customerStaticLocation.address || customerStaticLocation.label
                }
              : null,
            total: Number(ord?.subtotal || 0),
            payment_method: ord?.payment_method || null,
            notes: ord?.notes_to_driver || null,
            items: (items || []).map((oi: any) => ({
              name: oi.menu_item?.name || 'Item',
              quantity: oi.quantity,
              price: oi.price
            })),
            customer: {
              full_name: customerMap[ord.customer_id]?.full_name || '',
              phone: customerMap[ord.customer_id]?.phone || ''
            }
          }
        } as DeliveryWithOrder;
      });

      setDeliveries(mapped);

    } catch (err) {
      console.error('Failed to fully fetch deliveries; not using demo data', err);
      // If we fail entirely, keep current list (which might be empty) rather than forcing demo
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if an id looks like a UUID (v4)
  const isUUID = (id?: string | null) => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  };

  // formatDate moved above to be available for TrackingModal

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterDeliveries = (deliveries: DeliveryWithOrder[]) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

    switch (dateFilter) {
      case 'today':
        return completedDeliveries.filter(d => d.delivery_time?.startsWith(today));
      case 'yesterday':
        return completedDeliveries.filter(d => d.delivery_time?.startsWith(yesterday));
      case 'week':
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        return completedDeliveries.filter(d => d.delivery_time && d.delivery_time > weekAgo);
      default:
        return completedDeliveries;
    }
  };

  const sortDeliveries = (deliveries: DeliveryWithOrder[]) => {
    return [...deliveries].sort((a, b) => {
      const timeA = new Date(a.delivery_time || a.created_at).getTime();
      const timeB = new Date(b.delivery_time || b.created_at).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });
  };

  const exportHistoryCSV = () => {
    try {
      const rows = sortDeliveries(filterDeliveries(deliveries));
      if (!rows || rows.length === 0) return alert('No history to export.');

      const header = ['Order Number','Customer','Phone','Delivery Address','Status','Total','Payment Method','Notes','Created At','Pickup Time','Delivery Time'];
      const csv = [header.join(',')];

      rows.forEach((r: DeliveryWithOrder) => {
        const cols = [
          `"${r.order.order_number}"`,
          `"${r.order.customer.full_name}"`,
          `"${r.order.customer.phone}"`,
          `"${r.order.delivery_address || ''}"`,
          `"${r.status}"`,
          `${Number(r.order.total).toFixed(2)}`,
          `"${r.order.payment_method || ''}"`,
          `"${(r.order.notes || '').replace(/"/g, '""')}"`,
          `"${r.created_at || ''}"`,
          `"${r.pickup_time || ''}"`,
          `"${r.delivery_time || ''}"`
        ];
        csv.push(cols.join(','));
      });

      const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery_history_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export CSV failed', e);
      alert('Failed to export CSV');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdownId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dark Mode Toggle */}
      <div className="flex justify-end">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
        </button>
      </div>

      {/* Demo indicator and controls */}
      {deliveries === mockDeliveries && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 rounded-md">
          <div className="flex items-center justify-between">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">Demo data shown — no live deliveries found.</div>
            <div className="flex items-center space-x-2">
              <button onClick={() => fetchDeliveries()} className="text-sm px-3 py-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md dark:text-gray-200">Reload</button>
            </div>
          </div>
        </div>
      )}


      <div className="bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800 rounded-xl sm:rounded-2xl p-3 sm:p-8 text-white transition-all duration-200">
        <h1 className="text-lg sm:text-3xl font-bold mb-1 sm:mb-2">Delivery Dashboard</h1>
        <p className="text-orange-100 dark:text-orange-200 text-xs sm:text-base">Manage your delivery assignments</p>
      </div>

      {/* Responsive horizontal scroll for dashboard cards */}
      <div className="overflow-x-auto pb-2 -mx-2">
        <div className="flex min-w-[340px] sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 px-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 min-w-[220px] w-full flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Package className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Assigned</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.assigned}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 min-w-[220px] w-full flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bike className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 min-w-[220px] w-full flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Completed Today</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 dark:border-gray-700 min-w-[220px] w-full flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Today's Earnings</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">RM {stats.todayEarnings}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setShowHistory(false)}
          className={`px-4 py-2 rounded-lg font-medium ${
            !showHistory 
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Active Deliveries
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`px-4 py-2 rounded-lg font-medium ${
            showHistory 
              ? 'bg-orange-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Delivery History
        </button>
      </div>

      {showHistory ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div className="text-lg font-semibold dark:text-white">Delivery History</div>
            <div>
              <button onClick={() => exportHistoryCSV()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm">Export CSV</button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Date Range:</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">Past Week</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto border dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {sortDeliveries(filterDeliveries(deliveries)).map((delivery) => (
            <div key={delivery.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 dark:bg-gray-700/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{delivery.order.order_number}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order.customer.full_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Completed: {formatDate(delivery.delivery_time || '')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                  Delivered
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Delivery Address: <span className="text-gray-900 dark:text-white">{delivery.order.delivery_address}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Order Total: <span className="font-semibold dark:text-white">RM {Number(delivery.order.total).toFixed(2)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Active Deliveries</h2>

          {deliveries.filter(d => d.status !== 'completed' && d.status !== 'delivered' && d.status !== 'cancelled').length > 0 ? (
          <div className="space-y-4">
            {deliveries
              .filter((d) => d.status !== 'completed' && d.status !== 'delivered' && d.status !== 'cancelled')
              .sort((a, b) => {
                const aPriority = statusPriority[a.status] ?? 3;
                const bPriority = statusPriority[b.status] ?? 3;
                if (aPriority !== bPriority) return aPriority - bPriority;
                const timeA = new Date(a.created_at).getTime();
                const timeB = new Date(b.created_at).getTime();
                return timeB - timeA;
              })
              .map((delivery) => (
              <div
                key={delivery.id}
                onClick={() => { setSelectedDelivery(delivery); setShowDetailModal(true); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDelivery(delivery);
                    setShowDetailModal(true);
                  }
                }}
                className="group border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-600 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 w-full bg-white dark:bg-gray-700/50"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{delivery.order.order_number}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order.customer.full_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.order.customer.phone}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                    {delivery.status === 'assigned'
                      ? 'Unassigned'
                      : (delivery.status.replace('_', ' ').charAt(0).toUpperCase() + delivery.status.slice(1))}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-3 group-hover:translate-x-0.5 transition-transform">
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>Tap for full delivery details</span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Address:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{delivery.order.delivery_address}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Order Total: <span className="font-semibold text-gray-900 dark:text-white">RM {Number(delivery.order.total).toFixed(2)}</span>
                  </p>
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedDeliveryForTracking(delivery); setShowTrackingModal(true); }}
                      className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 shadow-sm"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>View Map</span>
                    </button>
                  {delivery.status !== 'delivered' && (
                    delivery.status === 'assigned' ? (
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          await handleAcceptDelivery(delivery);
                        }}
                        disabled={updating}
                        className={`${
                          updating 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium`}
                      >
                        {updating ? 'Accepting...' : 'Accept Order'}
                      </button>
                    ) : (
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === delivery.id ? null : delivery.id); }}
                          disabled={updating}
                          className={`${
                            updating 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-orange-600 hover:bg-orange-700'
                          } text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2`}
                        >
                          {updating ? 'Updating...' : 'Next Action'}
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {openDropdownId === delivery.id && !updating && (
                          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                            {delivery.status === 'picked_up' && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setUpdating(true);
                                  const timestamp = new Date().toISOString();
                                  const dbId = isUUID(delivery.id);
                                  if (!dbId) {
                                    const newDeliveries = deliveries.map(d => {
                                      if (d.id === delivery.id) {
                                        return { ...d, status: 'en_route', status_history: [...d.status_history, { status: 'en_route', timestamp, previous_status: d.status }] };
                                      }
                                      return d;
                                    });
                                    setDeliveries(newDeliveries);
                                    setUpdating(false);
                                    return;
                                  }
                                  try {
                                    await supabase.from('deliveries').update({ status: 'en_route' }).eq('id', delivery.id);
                                    await supabase.from('orders').update({ status: 'out_for_delivery' }).eq('id', delivery.order_id);
                                    await fetchDeliveries();
                                  } catch (err) {
                                    console.error(err);
                                    alert('Failed to update status');
                                  } finally {
                                    setUpdating(false);
                                  }
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white rounded-t-lg"
                              >
                                📍 Mark En Route
                              </button>
                            )}
                            {delivery.status === 'en_route' && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setUpdating(true);
                                  const timestamp = new Date().toISOString();
                                  const dbId = isUUID(delivery.id);
                                  if (!dbId) {
                                    const newDeliveries = deliveries.map(d => {
                                      if (d.id === delivery.id) {
                                        return { ...d, status: 'delivered', delivery_time: timestamp, status_history: [...d.status_history, { status: 'delivered', timestamp, previous_status: d.status }] };
                                      }
                                      return d;
                                    });
                                    setDeliveries(newDeliveries);
                                    setUpdating(false);
                                    return;
                                  }
                                  try {
                                    await supabase.from('deliveries').update({ status: 'delivered', delivery_time: timestamp }).eq('id', delivery.id);
                                    await supabase.from('orders').update({ status: 'completed', completed_at: timestamp }).eq('id', delivery.order_id);
                                    await fetchDeliveries();
                                  } catch (err) {
                                    console.error(err);
                                    alert('Failed to update status');
                                  } finally {
                                    setUpdating(false);
                                  }
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white rounded-t-lg"
                              >
                                ✅ Mark Delivered
                              </button>
                            )}
                            {delivery.status === 'picked_up' && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setUpdating(true);
                                  const timestamp = new Date().toISOString();
                                  const dbId = isUUID(delivery.id);
                                  if (!dbId) {
                                    const newDeliveries = deliveries.map(d => {
                                      if (d.id === delivery.id) {
                                        return { ...d, status: 'delivered', delivery_time: timestamp, status_history: [...d.status_history, { status: 'delivered', timestamp, previous_status: d.status }] };
                                      }
                                      return d;
                                    });
                                    setDeliveries(newDeliveries);
                                    setUpdating(false);
                                    return;
                                  }
                                  try {
                                    await supabase.from('deliveries').update({ status: 'delivered', delivery_time: timestamp }).eq('id', delivery.id);
                                    await supabase.from('orders').update({ status: 'completed', completed_at: timestamp }).eq('id', delivery.order_id);
                                    await fetchDeliveries();
                                  } catch (err) {
                                    console.error(err);
                                    alert('Failed to update status');
                                  } finally {
                                    setUpdating(false);
                                  }
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 rounded-b-lg"
                              >
                                ⏩ Skip to Delivered
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <Bike className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p>No active deliveries</p>
          </div>
        )}
      </div>
    )}

      <DeliveryDetailModal
        delivery={selectedDelivery}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onOpenMap={() => {
          if (selectedDelivery) {
            setSelectedDeliveryForTracking(selectedDelivery);
            setShowTrackingModal(true);
            setShowDetailModal(false);
          }
        }}
        onAccept={async () => {
          await handleAcceptDelivery(selectedDelivery, { closeDetail: true });
        }}
        onUpdateStatus={async (status) => {
          try {
            setUpdating(true);
            const timestamp = new Date().toISOString();

            const dbId = isUUID(selectedDelivery?.id);

            if (!dbId) {
              // Update local mock state only
              const newDeliveries = (deliveries || []).map(d => {
                if (d.id === selectedDelivery?.id) {
                  const nextHistory = [
                    ...d.status_history,
                    { status, timestamp, previous_status: d.status }
                  ];
                  return {
                    ...d,
                    status,
                    ...(status === 'picked_up' ? { pickup_time: timestamp } : {}),
                    ...(status === 'delivered' ? { delivery_time: timestamp } : {}),
                    status_history: nextHistory
                  } as DeliveryWithOrder;
                }
                return d;
              });

              setDeliveries(newDeliveries);

              setShowDetailModal(false);
              return;
            }

            const updates: any = {
              status,
              ...(status === 'picked_up' ? { pickup_time: timestamp } : {}),
              ...(status === 'delivered' ? { delivery_time: timestamp } : {})
            };

            const { error: delErr } = await supabase
              .from('deliveries')
              .update(updates)
              .eq('id', selectedDelivery?.id);

            if (delErr) throw delErr;

            if (status === 'picked_up') {
              await supabase
                .from('orders')
                .update({ status: 'out_for_delivery', driver_id: profile?.id })
                .eq('id', selectedDelivery?.order_id);
            } else if (status === 'delivered') {
              await supabase
                .from('orders')
                .update({ status: 'completed', completed_at: timestamp })
                .eq('id', selectedDelivery?.order_id);
            }

            await fetchDeliveries();
            setShowDetailModal(false);
          } catch (err) {
            console.error(err);
            alert('Failed to update status.');
          } finally {
            setUpdating(false);
          }
        }}
      />

      <TrackingModal
        delivery={selectedDeliveryForTracking}
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
      />

      <UpdateStatusModal
        delivery={selectedDelivery}
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onUpdateStatus={async (status) => {
          try {
            setUpdating(true);
            
            const timestamp = new Date().toISOString();
            // Persist status to Supabase
            const updates: any = {
              status,
              ...(status === 'picked_up' ? { pickup_time: timestamp } : {}),
              ...(status === 'delivered' ? { delivery_time: timestamp } : {})
            };
            const dbId = isUUID(selectedDelivery?.id);

            if (!dbId) {
              // Update only local mock state
              const newDeliveries = (deliveries || []).map(d => {
                if (d.id === selectedDelivery?.id) {
                  const nextHistory = [
                    ...d.status_history,
                    { status, timestamp, previous_status: d.status }
                  ];
                  return {
                    ...d,
                    status,
                    ...(status === 'picked_up' ? { pickup_time: timestamp } : {}),
                    ...(status === 'delivered' ? { delivery_time: timestamp } : {}),
                    status_history: nextHistory
                  } as DeliveryWithOrder;
                }
                return d;
              });

              setDeliveries(newDeliveries);

              setShowStatusModal(false);
              return;
            }

            const { error: delErr } = await supabase
              .from('deliveries')
              .update(updates)
              .eq('id', selectedDelivery?.id);

            if (delErr) throw delErr;

            // Update orders table status accordingly
            if (status === 'picked_up') {
              await supabase
                .from('orders')
                .update({ status: 'out_for_delivery', driver_id: profile?.id })
                .eq('id', selectedDelivery?.order_id);
            } else if (status === 'delivered') {
              await supabase
                .from('orders')
                .update({ status: 'completed', completed_at: timestamp })
                .eq('id', selectedDelivery?.order_id);
            }

            // Refresh local data by refetching deliveries
            await fetchDeliveries();
            setShowStatusModal(false);
          } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
          } finally {
            setUpdating(false);
          }
        }}
      />
    </div>
  );
}
