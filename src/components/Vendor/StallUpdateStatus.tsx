import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface UpdateRequest {
  id: string;
  request_status: 'pending' | 'approved' | 'rejected';
  admin_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  new_stallname: string | null;
  vendor_id?: string;
}

export function StallUpdateStatus() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    fetchRequests();

    // Realtime: watch INSERTs and UPDATEs for this vendor
    const channel = supabase
      .channel('vendor_stall_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stall_update_requests', filter: `vendor_id=eq.${profile.id}` },
        () => fetchRequests()
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const fetchRequests = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stall_update_requests')
        .select('id, request_status, admin_comment, reviewed_at, created_at, new_stallname')
        .eq('vendor_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRequests((data as UpdateRequest[]) || []);
    } catch (err) {
      console.error('Error fetching update requests:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (requests.length === 0) return null;

  const getStatusIcon = (status: UpdateRequest['request_status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: UpdateRequest['request_status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'approved': return 'bg-green-50 border-green-200';
      case 'rejected': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r.id} className={`rounded-xl p-4 border ${getStatusColor(r.request_status)}`}>
          <div className="flex items-start gap-3">
            {getStatusIcon(r.request_status)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900">
                  {r.request_status === 'pending' && 'Update Request Pending'}
                  {r.request_status === 'approved' && 'Update Request Approved'}
                  {r.request_status === 'rejected' && 'Update Request Rejected'}
                </h4>
                <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>

              {r.request_status === 'pending' && (
                <p className="text-sm text-gray-600">Your stall update request is being reviewed by administrators.</p>
              )}

              {r.admin_comment && (
                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">Admin Message:</p>
                  <p className="text-sm text-gray-900">{r.admin_comment}</p>
                </div>
              )}

              {r.request_status === 'approved' && !r.admin_comment && (
                <p className="text-sm text-green-700">Your stall details have been updated successfully.</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
