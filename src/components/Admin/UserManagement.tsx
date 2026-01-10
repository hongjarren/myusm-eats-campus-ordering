import { useEffect, useMemo, useState } from 'react';
import { supabase, Profile } from '../../lib/supabase';
import { ToastContainer } from './Toast';
import { useToast } from './useToast';
import { Store, User, Truck, Search, Lock, Unlock, Eye } from 'lucide-react';

type TabType = 'vendors' | 'students' | 'delivery';

type ProfileExtras = {
  email?: string | null;
  phone?: string | null;
  hostel_address?: string | null;
  is_active?: boolean | null;
};

type VendorRow = Omit<Profile, 'hostel_address'> & ProfileExtras;
type StudentRow = Omit<Profile, 'hostel_address'> & ProfileExtras;

type DeliveryRow = Omit<Profile, 'hostel_address'> &
  ProfileExtras & {
    last_delivery?: string | null;
    total_deliveries?: number;
  };

// shape of rows from the view v_admin_delivery_stats
type DeliveryStatsView = {
  rider_id: string;
  rider_name: string | null;
  rider_email: string | null;
  total_deliveries: number | null;
  last_delivery: string | null;
};

export function UserManagement() {
  const { toasts, showToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [delivery, setDelivery] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Live updates for Delivery tab: when deliveries or orders change, refresh the stats
  useEffect(() => {
    if (activeTab !== 'delivery') return;

    const channel = supabase
      .channel('admin-delivery-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => fetchDelivery())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchDelivery())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: 'role=eq.delivery' }, () =>
        fetchDelivery()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'vendors') {
        await fetchVendors();
      } else if (activeTab === 'students') {
        await fetchStudents();
      } else {
        await fetchDelivery();
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Vendors
  async function fetchVendors() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vendor')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows: VendorRow[] = (data ?? []).map((v: any) => ({
      ...(v as VendorRow),
      is_active: v.is_active ?? true
    }));

    setVendors(rows);
  }

  // Students
  async function fetchStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows: StudentRow[] = (data ?? []).map((s: any) => ({
      ...(s as StudentRow),
      is_active: s.is_active ?? true
    }));
    setStudents(rows);
  }

  // Delivery — optimized: merge profiles with v_admin_delivery_stats
  async function fetchDelivery() {
    // 1) profiles (who are riders)
    const { data: riders, error: ridersErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_active')
      .eq('role', 'delivery')
      .order('created_at', { ascending: false });

    if (ridersErr) throw ridersErr;

    // 2) view with totals + last_delivery
    const { data: viewRows, error: viewErr } = await supabase
      .from('v_admin_delivery_stats')
      .select('rider_id, total_deliveries, last_delivery');

    if (viewErr) throw viewErr;

    const viewMap = new Map<string, DeliveryStatsView>();
    (viewRows ?? []).forEach((r: any) => viewMap.set(r.rider_id, r));

    // 3) merge
    const merged: DeliveryRow[] = (riders ?? []).map((r: any) => {
      const stats = viewMap.get(r.id);
      return {
        ...(r as DeliveryRow),
        total_deliveries: stats?.total_deliveries ?? 0,
        last_delivery: stats?.last_delivery ?? null,
        is_active: r.is_active ?? true
      };
    });

    setDelivery(merged);
  }

  async function toggleActive(userId: string, current?: boolean | null) {
    const next = !(current ?? true);
    try {
      const { error } = await supabase.from('profiles').update({ is_active: next }).eq('id', userId);
      if (error) throw error;
      showToast(next ? 'User unblocked' : 'User blocked', 'success');
      await fetchData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
    }
  }

  // Filters
  const filteredVendors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter(
      (v) => (v.full_name ?? '').toLowerCase().includes(term) || (v.email ?? '').toLowerCase().includes(term)
    );
  }, [vendors, searchTerm]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        (s.full_name ?? '').toLowerCase().includes(term) ||
        (s.hostel_address ?? '').toLowerCase().includes(term) ||
        (s.phone ?? '').toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  const filteredDelivery = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return delivery;
    return delivery.filter((r) => (r.full_name ?? '').toLowerCase().includes(term));
  }, [delivery, searchTerm]);

  const fmtLast = (ts?: string | null) =>
    ts
      ? new Date(ts).toLocaleString('en-MY', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Never';

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Tabs */}
      <div className="surface">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex-1 nav-tab justify-center min-h-[44px] ${activeTab === 'vendors' ? 'nav-tab--active' : ''}`}
            aria-label="View vendors"
            aria-current={activeTab === 'vendors' ? 'page' : undefined}
          >
            <div className="flex items-center justify-center gap-2">
              <Store className="h-5 w-5" aria-hidden="true" />
              <span>Vendors</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 nav-tab justify-center min-h-[44px] ${activeTab === 'students' ? 'nav-tab--active' : ''}`}
            aria-label="View students"
            aria-current={activeTab === 'students' ? 'page' : undefined}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="h-5 w-5" aria-hidden="true" />
              <span>Students</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 nav-tab justify-center min-h-[44px] ${activeTab === 'delivery' ? 'nav-tab--active' : ''}`}
            aria-label="View delivery riders"
            aria-current={activeTab === 'delivery' ? 'page' : undefined}
          >
            <div className="flex items-center justify-center gap-2">
              <Truck className="h-5 w-5" aria-hidden="true" />
              <span>Delivery</span>
            </div>
          </button>
        </div>
      </div>

      {/* Search */}
      {(activeTab === 'students' || activeTab === 'delivery' || activeTab === 'vendors') && (
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <input
              type="text"
              placeholder={
                activeTab === 'students'
                  ? 'Search by name, hostel, or phone...'
                  : activeTab === 'vendors'
                  ? 'Search by name or email...'
                  : 'Search by name...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              aria-label="Search users"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Vendors */}
          {activeTab === 'vendors' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map((v) => (
                    <tr key={v.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{v.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{v.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            (v.is_active ?? true) ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {(v.is_active ?? true) ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => toggleActive(v.id, v.is_active)}
                          className={`min-h-[44px] px-3 py-2 ${
                            (v.is_active ?? true) ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                          } inline-flex items-center gap-1`}
                          aria-label={`${(v.is_active ?? true) ? 'Block' : 'Unblock'} ${v.full_name}`}
                        >
                          {(v.is_active ?? true) ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
                          {(v.is_active ?? true) ? 'Block' : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Students */}
          {activeTab === 'students' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hostel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{s.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{s.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{s.hostel_address || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{s.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            (s.is_active ?? true) ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {(s.is_active ?? true) ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => toggleActive(s.id, s.is_active)}
                          className={`min-h-[44px] px-3 py-2 ${
                            (s.is_active ?? true) ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                          } inline-flex items-center gap-1`}
                          aria-label={`${(s.is_active ?? true) ? 'Block' : 'Unblock'} ${s.full_name}`}
                        >
                          {(s.is_active ?? true) ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
                          {(s.is_active ?? true) ? 'Block' : 'Unblock'}
                        </button>

                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="min-h-[44px] px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
                          aria-label={`View details for ${s.full_name}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Delivery */}
          {activeTab === 'delivery' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Deliveries</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDelivery.map((r) => (
                    <tr key={r.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{r.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{r.total_deliveries ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{fmtLast(r.last_delivery)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            (r.is_active ?? true) ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {(r.is_active ?? true) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => toggleActive(r.id, r.is_active)}
                          className={`min-h-[44px] px-3 py-2 ${
                            (r.is_active ?? true) ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300' : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                          } inline-flex items-center gap-1`}
                          aria-label={`${(r.is_active ?? true) ? 'Block' : 'Unblock'} ${r.full_name}`}
                        >
                          {(r.is_active ?? true) ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
                          {(r.is_active ?? true) ? 'Block' : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStudent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-modal-title"
        >
          <div 
            className="card max-w-md w-full max-h-[90vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelectedStudent(null);
            }}
            tabIndex={-1}
          >
            <h3 id="student-modal-title" className="text-xl font-bold mb-4 dark:text-white">Student Profile</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium dark:text-white">{selectedStudent.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium break-all dark:text-white">{selectedStudent.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Hostel Address</p>
                <p className="font-medium dark:text-white">{selectedStudent.hostel_address || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                <p className="font-medium dark:text-white">{selectedStudent.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    (selectedStudent.is_active ?? true) ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {(selectedStudent.is_active ?? true) ? 'Active' : 'Blocked'}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="min-h-[44px] px-4 py-2.5 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label="Close modal"
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
