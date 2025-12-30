import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Check, X, Loader2, RefreshCcw, Search } from 'lucide-react';
import { ToastContainer } from './Toast';
import { useToast } from './useToast';

type ApprovalState = 'pending' | 'approved' | 'rejected';

interface Stall {
  id: string;
  name: string;
  description: string | null;
  operationhour: string | null;
  imageurl: string | null;
  cafeid: string;
  cafe_name: string;
  vendorid: string | null;
  vendor_name: string;
  vendor_email: string;
  /** ADMIN application status (not the vendor availability badge) */
  approval_status: ApprovalState;
  created_at: string;
  categories?: string[] | null;
}

export function StallApplications() {
  const { toasts, showToast, removeToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [selected, setSelected] = useState<Stall | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalState | 'all'>('all');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('v_admin_stall_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(error.message || 'Failed to fetch stall applications', 'error');
      setLoading(false);
      return;
    }

    const normalized: Stall[] =
      (data ?? []).map((s: any) => ({
        ...s,
        categories: Array.isArray(s.categories)
          ? s.categories
          : typeof s.categories === 'string' && s.categories.length
          ? s.categories
              .split(',')
              .map((c: string) => c.trim())
              .filter(Boolean)
          : [],
        approval_status: (s.approval_status || 'pending') as ApprovalState,
      })) ?? [];

    setStalls(normalized);
    setLoading(false);
  };

  const optimisticUpdate = (id: string, newState: ApprovalState) => {
    setStalls(prev => prev.map(s => (s.id === id ? { ...s, approval_status: newState } : s)));
  };

  const approve = async (stallId: string) => {
    if (rowBusy) return;
    setRowBusy(stallId);
    const prev = stalls.find(s => s.id === stallId)?.approval_status ?? 'pending';
    optimisticUpdate(stallId, 'approved');

    const { error } = await supabase.rpc('approve_stall', { stall_id: stallId });

    if (error) {
      optimisticUpdate(stallId, prev);
      showToast(error.message || 'Failed to approve stall', 'error');
    } else {
      showToast('Stall approved', 'success');
    }
    setRowBusy(null);
  };

  const reject = async (stallId: string) => {
    if (rowBusy) return;
    setRowBusy(stallId);
    const prev = stalls.find(s => s.id === stallId)?.approval_status ?? 'pending';
    optimisticUpdate(stallId, 'rejected');

    const { error } = await supabase.rpc('reject_stall', { stall_id: stallId });

    if (error) {
      optimisticUpdate(stallId, prev);
      showToast(error.message || 'Failed to reject stall', 'error');
    } else {
      showToast('Stall rejected', 'success');
    }
    setRowBusy(null);
  };

  const pendingCount = useMemo(
    () => stalls.filter(s => (s.approval_status || 'pending') === 'pending').length,
    [stalls]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stalls.filter(s => {
      const passStatus = statusFilter === 'all' ? true : s.approval_status === statusFilter;
      const inText =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.cafe_name.toLowerCase().includes(q) ||
        s.vendor_name.toLowerCase().includes(q) ||
        (s.vendor_email || '').toLowerCase().includes(q);
      return passStatus && inText;
    });
  }, [stalls, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold dark:text-white">Stall Applications</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">Pending: {pendingCount}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search stall, cafe, or vendor..."
                className="pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                aria-label="Search stall applications"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="min-h-[44px] text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={fetchData}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
              aria-label="Refresh applications"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stall</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cafe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(s => {
                  const status = s.approval_status;
                  const statusStyle =
                    status === 'approved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                      : status === 'rejected'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
                  const acting = rowBusy === s.id;

                  return (
                    <tr key={s.id} className={acting ? 'opacity-75' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {s.name}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(s.created_at).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{s.cafe_name}</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {s.vendor_name}
                        <br />
                        <span className="text-xs text-gray-400 dark:text-gray-500">{s.vendor_email}</span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyle}`}>
                          {status}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          onClick={() => setSelected(s)}
                          className="min-h-[44px] px-3 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                          aria-label={`View details for ${s.name}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          View
                        </button>

                        <button
                          onClick={() => approve(s.id)}
                          className="min-h-[44px] px-3 py-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 inline-flex items-center gap-1 disabled:opacity-40"
                          disabled={status === 'approved' || acting}
                          aria-label={`Approve ${s.name}`}
                        >
                          {acting ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          )}
                          Approve
                        </button>

                        <button
                          onClick={() => reject(s.id)}
                          className="min-h-[44px] px-3 py-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 inline-flex items-center gap-1 disabled:opacity-40"
                          disabled={status === 'rejected' || acting}
                          aria-label={`Reject ${s.name}`}
                        >
                          {acting ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <X className="h-4 w-4" aria-hidden="true" />
                          )}
                          Reject
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
              <Loader2 className="h-6 w-6" />
            </div>
            <div className="font-medium">No applications match your filters.</div>
            <div className="text-sm">Try clearing the search or switching the status filter.</div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stall-details-title"
        >
          <div
            className="card w-full max-w-xl max-h-[90vh] overflow-y-auto relative"
            onClick={e => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSelected(null);
            }}
            tabIndex={-1}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close details modal"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>

            <h2 id="stall-details-title" className="text-xl font-bold mb-4 pr-10 dark:text-white">Stall Application Details</h2>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Name</div>
                <div className="font-medium text-gray-900 dark:text-white">{selected.name}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Cafe</div>
                <div className="text-gray-900 dark:text-white">{selected.cafe_name}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Vendor</div>
                <div className="text-gray-900 dark:text-white">{selected.vendor_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{selected.vendor_email}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Application Status</div>
                <div className="text-gray-900 dark:text-white">{selected.approval_status}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Submitted At</div>
                <div className="text-gray-900 dark:text-white">
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>

              {selected.description && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Description</div>
                  <div className="text-gray-900 dark:text-white whitespace-pre-line">{selected.description}</div>
                </div>
              )}

              {selected.operationhour && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Operating Hours</div>
                  <div className="text-gray-900 dark:text-white">{selected.operationhour}</div>
                </div>
              )}

              {selected.categories && selected.categories.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Categories</div>
                  <div className="text-gray-900 dark:text-white">{selected.categories.join(', ')}</div>
                </div>
              )}

              {selected.imageurl && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Stall Image</div>
                  <img
                    src={selected.imageurl}
                    alt={`Image of ${selected.name} stall`}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="min-h-[44px] px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label="Close modal"
              >
                Close
              </button>

              <button
                onClick={async () => {
                  await approve(selected.id);
                  setSelected(null);
                }}
                className="min-h-[44px] px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 inline-flex items-center justify-center gap-2 disabled:opacity-40"
                disabled={selected.approval_status === 'approved' || rowBusy === selected.id}
                aria-label={`Approve ${selected.name} stall application`}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Approve
              </button>

              <button
                onClick={async () => {
                  await reject(selected.id);
                  setSelected(null);
                }}
                className="min-h-[44px] px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 inline-flex items-center justify-center gap-2 disabled:opacity-40"
                disabled={selected.approval_status === 'rejected' || rowBusy === selected.id}
                aria-label={`Reject ${selected.name} stall application`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
