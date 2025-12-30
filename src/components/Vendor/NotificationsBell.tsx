import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Clock, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type VendorNotification = {
  id: string;
  vendor_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsBell() {
  const { profile } = useAuth();
  const [items, setItems] = useState<VendorNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter(n => !n.read_at).length;

  useEffect(() => {
    if (!profile?.id) return;

    fetchNotifications();

    // realtime subscription
    const sub = supabase
      .channel('vendor_notifications_rt')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vendor_notifications',
          filter: `vendor_id=eq.${profile.id}`,
        },
        (payload) => {
          const n = payload.new as VendorNotification;
          setItems(prev => [n, ...prev].slice(0, 30));
        }
      )
      .subscribe();

    // click-outside to close
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);

    return () => {
      sub.unsubscribe();
      document.removeEventListener('mousedown', onDocClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function fetchNotifications() {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('vendor_notifications')
      .select('*')
      .eq('vendor_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!error) setItems((data as VendorNotification[]) ?? []);
    setLoading(false);
  }

  async function markAllRead() {
    if (!profile?.id) return;
    const { error } = await supabase
      .from('vendor_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('vendor_id', profile.id)
      .is('read_at', null);
    if (!error) {
      setItems(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="relative p-2 rounded-full hover:bg-white/40 focus:outline-none"
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
      >
        <Bell className="h-6 w-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-red-600 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-screen z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">Notifications</div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b last:border-b-0 ${!n.read_at ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-3">
                    {iconFor(n)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        {!n.read_at && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white">New</span>}
                      </div>
                      <p className="text-sm text-gray-700">{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 text-right">
            <button
              onClick={() => setOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function iconFor(n: VendorNotification) {
  if (n.type === 'stall_update') {
    const status = n.data?.status as string | undefined;
    if (status === 'approved') return <Check className="h-5 w-5 text-green-600 mt-0.5" />;
    if (status === 'rejected') return <X className="h-5 w-5 text-red-600 mt-0.5" />;
    return <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />;
  }
  return <Bell className="h-5 w-5 text-gray-600 mt-0.5" />;
}
