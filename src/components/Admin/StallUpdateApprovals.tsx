import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ToastContainer } from './Toast';
import { useToast } from './useToast';
import { Store, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';

interface StallUpdateRequest {
  id: string;
  stall_id: string;
  vendor_id: string;

  request_status: 'pending' | 'approved' | 'rejected';
  admin_comment: string | null;
  reviewed_at: string | null;
  created_at: string;

  new_stallname: string | null;
  new_contact: string | null;
  new_operation_days: string[] | null;
  new_open_time: string | null;
  new_close_time: string | null;
  new_imageurl: string | null;
  new_description: string | null;

  vendor?: {
    full_name: string | null;
    email: string | null;
  }[];
  stall?: {
    stallname: string | null;
    contact: string | null;
    operation_days: string[] | null;
    open_time: string | null;
    close_time: string | null;
    imageurl: string | null;
    description: string | null;
  }[];
}

export function StallUpdateApprovals() {
  const { toasts, showToast, removeToast } = useToast();
  const [requests, setRequests] = useState<StallUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState<StallUpdateRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'view'>('view');
  const [adminComment, setAdminComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showChangedOnly, setShowChangedOnly] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('stall_update_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_update_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, []);

  /**
   * Try a view first (v_admin_stall_updates). If it doesn't exist,
   * fall back to nested select with FK aliases.
   */
  async function fetchRequests() {
    setLoading(true);
    try {
      // 1) Attempt to read from the view if present
      const viewAttempt = await supabase
        .from('v_admin_stall_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!viewAttempt.error && viewAttempt.data) {
        // Map view rows back to the shape your UI expects
        const mapped: StallUpdateRequest[] = (viewAttempt.data as any[]).map((r) => ({
          id: r.id,
          stall_id: r.stall_id,
          vendor_id: r.vendor_id,

          request_status: r.request_status,
          admin_comment: r.admin_comment ?? null,
          reviewed_at: r.reviewed_at ?? null,
          created_at: r.created_at,

          new_stallname: r.new_stallname ?? null,
          new_contact: r.new_contact ?? null,
          new_operation_days: r.new_operation_days ?? null,
          new_open_time: r.new_open_time ?? null,
          new_close_time: r.new_close_time ?? null,
          new_imageurl: r.new_imageurl ?? null,
          new_description: r.new_description ?? null,

          vendor: [{ full_name: r.vendor_full_name ?? null, email: r.vendor_email ?? null }],
          stall: [
            {
              stallname: r.stall_name ?? null,
              contact: r.stall_contact ?? null,
              operation_days: r.operation_days ?? null,
              open_time: r.open_time ?? null,
              close_time: r.close_time ?? null,
              imageurl: r.imageurl ?? null,
              description: r.description ?? null,
            },
          ],
        }));

        setRequests(mapped);
        setLoading(false);
        return;
      }

      // 2) Fallback: nested select with FK alias (requires FKs + RLS SELECT policies)
      const { data, error } = await supabase
        .from('stall_update_requests')
        .select(`
          id, stall_id, vendor_id, request_status, admin_comment, reviewed_at, created_at,
          new_stallname, new_contact, new_operation_days, new_open_time, new_close_time, new_imageurl, new_description,
          vendor:profiles!stall_update_requests_vendor_id_fkey ( full_name, email ),
          stall:stall!stall_update_requests_stall_id_fkey ( stallname, contact, operation_days, open_time, close_time, imageurl, description )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests((data as StallUpdateRequest[]) ?? []);
    } catch (err: any) {
      console.error('fetchRequests error:', err);
      showToast(err.message || 'Failed to fetch stall update requests', 'error');
    } finally {
      setLoading(false);
    }
  }

  const openModal = (request: StallUpdateRequest, type: 'approve' | 'reject' | 'view') => {
    setSelectedRequest(request);
    setModalType(type);
    setAdminComment(request.admin_comment || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setAdminComment('');
  };

  async function handleApprove() {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stall_update_requests')
        .update({
          request_status: 'approved',
          admin_comment: adminComment || 'Your stall update has been approved.',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      showToast('Stall update approved successfully', 'success');
      closeModal();
      fetchRequests();
    } catch (err: any) {
      console.error('approve error:', err);
      showToast(err.message || 'Failed to approve request', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selectedRequest) return;
    if (!adminComment.trim()) {
      showToast('Please provide a reason for rejection', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stall_update_requests')
        .update({
          request_status: 'rejected',
          admin_comment: adminComment,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      showToast('Stall update rejected', 'success');
      closeModal();
      fetchRequests();
    } catch (err: any) {
      console.error('reject error:', err);
      showToast(err.message || 'Failed to reject request', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const isChanged = (oldVal: any, newVal: any) =>
    JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null);

  function StatusBadge({ status }: { status: StallUpdateRequest['request_status'] }) {
    const base = 'px-2 py-1 text-xs font-semibold rounded-full';
    if (status === 'pending') return <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300`}>Pending</span>;
    if (status === 'approved') return <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300`}>Approved</span>;
    return <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300`}>Rejected</span>;
  }

  const CompareField = ({
    label,
    oldValue,
    newValue,
    showChangedOnly = false,
  }: {
    label: string;
    oldValue: any;
    newValue: any;
    showChangedOnly?: boolean;
  }) => {
    const changed = isChanged(oldValue, newValue);
    if (showChangedOnly && !changed) return null;

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
          <span
            className={`text-xs px-2 py-0.5 rounded border ${
              changed
                ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/50'
                : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}
          >
            {changed ? 'Changed' : 'Unchanged'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="p-2 rounded border bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</p>
            <p className={`text-sm ${changed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{oldValue ?? '—'}</p>
          </div>
          <div className={`p-2 rounded border ${changed ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800/50' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">New</p>
            <p className={`text-sm ${changed ? 'text-green-800 dark:text-green-300 font-medium' : 'text-gray-900 dark:text-white'}`}>{newValue ?? '—'}</p>
          </div>
        </div>
      </div>
    );
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

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stall Update Requests</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Review and approve vendor stall detail changes</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stall</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No stall update requests found
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {r.vendor?.[0]?.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {r.stall?.[0]?.stallname || 'Unknown Stall'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('en-MY')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={r.request_status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button 
                        onClick={() => openModal(r, 'view')} 
                        className="min-h-[44px] px-3 py-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                        aria-label={`View update request for ${r.stall?.[0]?.stallname || 'stall'}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                        View
                      </button>
                      {r.request_status === 'pending' && (
                        <>
                          <button 
                            onClick={() => openModal(r, 'approve')} 
                            className="min-h-[44px] px-3 py-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 inline-flex items-center gap-1"
                            aria-label={`Approve update for ${r.stall?.[0]?.stallname || 'stall'}`}
                          >
                            <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            Approve
                          </button>
                          <button 
                            onClick={() => openModal(r, 'reject')} 
                            className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1"
                            aria-label={`Reject update for ${r.stall?.[0]?.stallname || 'stall'}`}
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedRequest && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-modal-title"
        >
          <div 
            className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal();
            }}
            tabIndex={-1}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 id="update-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
                  {modalType === 'approve' && 'Approve Stall Update'}
                  {modalType === 'reject' && 'Reject Stall Update'}
                  {modalType === 'view' && 'View Stall Update Request'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Vendor: {selectedRequest.vendor?.[0]?.full_name ?? 'Unknown'} • Submitted:{' '}
                  {new Date(selectedRequest.created_at).toLocaleString('en-MY')}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={showChangedOnly}
                  onChange={(e) => setShowChangedOnly(e.target.checked)}
                  className="h-5 w-5"
                  aria-label="Show only changed fields"
                />
                Show changed only
              </label>
            </div>

            <div className="p-6 space-y-4">
              <CompareField
                label="Stall Name"
                oldValue={selectedRequest.stall?.[0]?.stallname}
                newValue={selectedRequest.new_stallname}
                showChangedOnly={showChangedOnly}
              />
              <CompareField
                label="Contact"
                oldValue={selectedRequest.stall?.[0]?.contact}
                newValue={selectedRequest.new_contact}
                showChangedOnly={showChangedOnly}
              />
              <CompareField
                label="Operating Days"
                oldValue={selectedRequest.stall?.[0]?.operation_days?.join(', ')}
                newValue={selectedRequest.new_operation_days?.join(', ')}
                showChangedOnly={showChangedOnly}
              />
              <div className="grid grid-cols-2 gap-3">
                <CompareField
                  label="Open Time"
                  oldValue={selectedRequest.stall?.[0]?.open_time}
                  newValue={selectedRequest.new_open_time}
                  showChangedOnly={showChangedOnly}
                />
                <CompareField
                  label="Close Time"
                  oldValue={selectedRequest.stall?.[0]?.close_time}
                  newValue={selectedRequest.new_close_time}
                  showChangedOnly={showChangedOnly}
                />
              </div>
              <CompareField
                label="Description"
                oldValue={selectedRequest.stall?.[0]?.description}
                newValue={selectedRequest.new_description}
                showChangedOnly={showChangedOnly}
              />

              {(selectedRequest.stall?.[0]?.imageurl || selectedRequest.new_imageurl) && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stall Image</label>
                    {selectedRequest.stall?.[0]?.imageurl !== selectedRequest.new_imageurl ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800/50">Changed</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border-gray-200 border dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">Unchanged</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="p-2 bg-gray-50 rounded border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Current</p>
                      {selectedRequest.stall?.[0]?.imageurl ? (
                        <img
                          src={selectedRequest.stall[0].imageurl as string}
                          alt={`Current image for ${selectedRequest.stall[0].stallname || 'stall'}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">No image</div>
                      )}
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">New</p>
                      {selectedRequest.new_imageurl ? (
                        <img 
                          src={selectedRequest.new_imageurl} 
                          alt={`Updated image for ${selectedRequest.stall?.[0]?.stallname || 'stall'}`} 
                          className="w-full h-32 object-cover rounded" 
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">No image</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(modalType === 'approve' || modalType === 'reject') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Message to Vendor {modalType === 'reject' && <span className="text-red-600">*</span>}
                  </label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder={
                      modalType === 'approve'
                        ? 'Optional: Add a message for the vendor...'
                        : 'Required: Explain why the request was rejected...'
                    }
                  />
                </div>
              )}

              {modalType === 'view' && selectedRequest.admin_comment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Comment:</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.admin_comment}</p>
                  {selectedRequest.reviewed_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Reviewed on {new Date(selectedRequest.reviewed_at).toLocaleString('en-MY')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="min-h-[44px] px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                aria-label={modalType === 'view' ? 'Close modal' : 'Cancel action'}
              >
                {modalType === 'view' ? 'Close' : 'Cancel'}
              </button>
              {modalType === 'approve' && (
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  aria-label="Approve stall update request"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  Approve
                </button>
              )}
              {modalType === 'reject' && (
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="min-h-[44px] px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  aria-label="Reject stall update request"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  )}
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
