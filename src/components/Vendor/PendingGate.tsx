import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { RefreshCcw, Store } from 'lucide-react';

type StallRow = {
  id: string;
  stallname: string;
  approval_status: 'pending' | 'approved' | 'rejected';
};

type Props = {
  children: React.ReactNode;
  /** how often to re-check for approval while user waits (ms). set 0 to disable polling */
  pollMs?: number;
};

export function PendingGate({ children, pollMs = 10000 }: Props) {
  const { profile } = useAuth();

  // We distinguish "first load" vs. subsequent background polls
  const [initialLoading, setInitialLoading] = useState(true);
  const [stall, setStall] = useState<StallRow | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = async (background = false) => {
    if (!profile?.id) return;
    if (!background) setInitialLoading(true);

    const { data } = await supabase
      .from('stall')
      .select('id, stallname, approval_status')
      .eq('vendorid', profile.id)
      .maybeSingle();

    if (!mounted.current) return;

    setStall((data as StallRow) ?? null);
    if (!background) setInitialLoading(false);
  };

  // initial load
  useEffect(() => {
    if (profile?.id) fetchOnce(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // background polling (never flips to spinner)
  useEffect(() => {
    if (!pollMs || pollMs <= 0 || !profile?.id) return;
    const t = setInterval(() => fetchOnce(true), pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, profile?.id]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  // No stall yet → let children render (register form, etc.)
  if (!stall) return <>{children}</>;

  // Gate only by stall approval; keep children mounted during background polls
  if (stall.approval_status !== 'approved') {
    const badge =
      stall.approval_status === 'pending'
        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">● pending</span>
        : <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">● {stall.approval_status}</span>;

    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white border rounded-2xl shadow-sm">
          <div className="flex items-center justify-between p-5 border-b">
            <h1 className="text-2xl font-bold">Vendor Onboarding</h1>
            <button
              onClick={() => fetchOnce(true)}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border hover:bg-gray-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-gray-600" />
                  <h2 className="font-semibold">Stall Application</h2>
                </div>
                {badge}
              </div>

              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium">{stall.stallname}</span> is under review by the admins.
              </p>

              <div className="mt-4">
                <Link
                  to="/vendor/menu?draft=1"
                  className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Start drafting menu
                </Link>
                <p className="mt-2 text-xs text-gray-500">
                  Draft items are hidden from customers until approval.
                </p>
              </div>
            </div>

            <div className="border rounded-xl p-5">
              <h3 className="font-semibold">While you wait</h3>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Upload photos, descriptions, and prices as <em>draft</em>.</li>
                <li>After approval, just toggle items live.</li>
                <li>Click <strong>Refresh</strong> to check for updates.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
