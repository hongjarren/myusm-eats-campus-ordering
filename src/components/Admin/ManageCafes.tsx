import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ToastContainer } from './Toast';
import { useToast } from './useToast';
import {
  Store, Plus, Edit, PencilLine, Trash2, X, Save, Search, Check,
} from 'lucide-react';

type CafeRow = {
  id: string;
  name: string | null;
  location: string | null;
  is_active: boolean | null;
  notes: string | null;
};

type StallLite = { id: string; cafeid: string };

/** Optional: best-effort audit (won't crash if table doesn't exist) */
async function audit(action: string, entity: string, entity_id: string, details?: any) {
  try {
    await supabase.from('admin_events').insert({
      action,
      entity,
      entity_id,
      details: details ? JSON.stringify(details) : null,
    } as any);
  } catch {
    // ignore if table/policy doesn't exist
  }
}

export function ManageCafes() {
  const [cafes, setCafes] = useState<CafeRow[]>([]);
  const [stalls, setStalls] = useState<StallLite[]>([]);
  const [loading, setLoading] = useState(true);

  // modal edit
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CafeRow | null>(null);

  // inline edit
  const [inlineId, setInlineId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<Partial<CafeRow>>({});

  // selection (bulk actions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toasts, showToast, removeToast } = useToast();

  const [cafeForm, setCafeForm] = useState<Partial<CafeRow>>({
    name: '',
    location: '',
    is_active: true,
    notes: '',
  });

  /** load data */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCafes(), fetchStalls()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** realtime */
  useEffect(() => {
    const cafesCh = supabase
      .channel('cfg_cafes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cafes' }, fetchCafes)
      .subscribe();
    const stallsCh = supabase
      .channel('cfg_stalls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall' }, fetchStalls)
      .subscribe();

    return () => {
      cafesCh.unsubscribe();
      stallsCh.unsubscribe();
    };
  }, []);

  const fetchCafes = async () => {
    const { data, error } = await supabase
      .from('cafes')
      .select('id, name, location, is_active, notes')
      .order('name', { ascending: true });
    if (error) return showToast(`Failed to fetch cafés: ${error.message}`, 'error');
    setCafes((data || []) as CafeRow[]);
  };

  const fetchStalls = async () => {
    const { data, error } = await supabase.from('stall').select('id, cafeid');
    if (error) return showToast(`Failed to fetch stalls: ${error.message}`, 'error');
    setStalls((data || []) as StallLite[]);
  };

  const stallCountByCafe = useMemo(() => {
    const m = new Map<string, number>();
    stalls.forEach((s) => m.set(s.cafeid, (m.get(s.cafeid) || 0) + 1));
    return m;
  }, [stalls]);

  const filtered = useMemo(() => {
    let rows = cafes;
    if (statusFilter !== 'all') {
      const active = statusFilter === 'active';
      rows = rows.filter((c) => (c.is_active ?? true) === active);
    }
    if (q.trim()) {
      const n = q.toLowerCase();
      rows = rows.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(n) ||
          (c.location || '').toLowerCase().includes(n)
      );
    }
    // clear selection when filter changes to avoid hidden selections
    setSelectedIds((prev) => new Set([...prev].filter((id) => rows.some((r) => r.id === id))));
    return rows;
  }, [cafes, q, statusFilter]);

  /** modal edit */
  const openModal = (item?: CafeRow) => {
    setEditingItem(item || null);
    setCafeForm(
      item
        ? {
            name: item.name || '',
            location: item.location || '',
            is_active: item.is_active ?? true,
            notes: item.notes || '',
          }
        : { name: '', location: '', is_active: true, notes: '' }
    );
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleSaveCafe = async () => {
    try {
      if (!cafeForm.name || !cafeForm.location) {
        showToast('Name and location are required', 'error');
        return;
      }

      const payload = {
        name: cafeForm.name,
        location: cafeForm.location,
        is_active: cafeForm.is_active ?? true,
        notes: cafeForm.notes || null,
      };

      if (editingItem) {
        const { error } = await supabase.from('cafes').update(payload).eq('id', editingItem.id);
        if (error) throw error;
        showToast('Café updated successfully', 'success');
        audit('update', 'cafes', editingItem.id, payload);
      } else {
        const { data, error } = await supabase.from('cafes').insert([payload]).select('id').single();
        if (error) throw error;
        showToast('Café created successfully', 'success');
        audit('insert', 'cafes', data?.id, payload);
      }

      closeModal();
      fetchCafes();
    } catch (err: any) {
      showToast(err.message || 'Failed to save café', 'error');
    }
  };

  /** inline edit */
  const startInline = (row: CafeRow) => {
    setInlineId(row.id);
    setInlineDraft({
      name: row.name ?? '',
      location: row.location ?? '',
      is_active: row.is_active ?? true,
      notes: row.notes ?? '',
    });
  };

  const cancelInline = () => {
    setInlineId(null);
    setInlineDraft({});
  };

  const saveInline = async (id: string) => {
    try {
      if (!inlineDraft.name || !inlineDraft.location) {
        showToast('Name and location are required', 'error');
        return;
      }
      const payload = {
        name: inlineDraft.name,
        location: inlineDraft.location,
        is_active: inlineDraft.is_active ?? true,
        notes: inlineDraft.notes || null,
      };
      const { error } = await supabase.from('cafes').update(payload).eq('id', id);
      if (error) throw error;
      showToast('Café updated', 'success');
      audit('update', 'cafes', id, payload);
      cancelInline();
      fetchCafes();
    } catch (e: any) {
      showToast(e.message || 'Inline save failed', 'error');
    }
  };

  /** quick toggle (optimistic) */
  const toggleActive = async (row: CafeRow) => {
    const next = !(row.is_active ?? true);
    // optimistic
    setCafes((cs) => cs.map((c) => (c.id === row.id ? { ...c, is_active: next } : c)));
    try {
      const { error } = await supabase.from('cafes').update({ is_active: next }).eq('id', row.id);
      if (error) throw error;
      showToast(next ? 'Activated' : 'Deactivated', 'success');
      audit('toggle', 'cafes', row.id, { is_active: next });
    } catch (e: any) {
      // revert
      setCafes((cs) => cs.map((c) => (c.id === row.id ? { ...c, is_active: row.is_active ?? true } : c)));
      showToast(e.message || 'Toggle failed', 'error');
    }
  };

  /** bulk actions */
  const toggleSelect = (id: string, v: boolean) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (v) n.add(id);
      else n.delete(id);
      return n;
    });
  };

  const selectAllVisible = (v: boolean) => {
    setSelectedIds((_) => (v ? new Set(filtered.map((r) => r.id)) : new Set()));
  };

  const bulkSetActive = async (active: boolean) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // optimistic
      setCafes((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, is_active: active } : c)));
      const { error } = await supabase
        .from('cafes')
        .update({ is_active: active })
        .in('id', ids);
      if (error) throw error;
      showToast(`${active ? 'Activated' : 'Deactivated'} ${ids.length} cafés`, 'success');
      ids.forEach((id) => audit('bulk_toggle', 'cafes', id, { is_active: active }));
      setSelectedIds(new Set());
    } catch (e: any) {
      showToast(e.message || 'Bulk action failed', 'error');
      fetchCafes(); // restore from server
    }
  };

  /** delete with guard rail */
  const handleDeleteCafe = async (id: string) => {
    const count = stallCountByCafe.get(id) ?? 0;
    if (count > 0) {
      showToast('Cannot delete: café still has stalls. Remove or reassign stalls first.', 'error');
      return;
    }
    if (!confirm('Delete this café? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('cafes').delete().eq('id', id);
      if (error) throw error;
      showToast('Café deleted', 'success');
      audit('delete', 'cafes', id);
      fetchCafes();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="card">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white">
            <Store className="h-5 w-5 dark:text-blue-400" />
            Manage Cafés
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or location…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Bulk actions (only when some are selected) */}
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => bulkSetActive(true)}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Activate ({selectedIds.size})
                </button>
                <button
                  onClick={() => bulkSetActive(false)}
                  className="px-3 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                >
                  Deactivate ({selectedIds.size})
                </button>
              </div>
            )}

            <button
              onClick={() => openModal()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Café
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={(e) => selectAllVisible(e.target.checked)}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stalls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((cafe) => {
                const count = stallCountByCafe.get(cafe.id) ?? 0;
                const isInline = inlineId === cafe.id;
                const selected = selectedIds.has(cafe.id);

                return (
                  <tr key={cafe.id} className={isInline ? 'bg-slate-50 dark:bg-slate-900' : ''}>
                    {/* SELECT */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => toggleSelect(cafe.id, e.target.checked)}
                        aria-label={`Select ${cafe.name ?? 'café'}`}
                      />
                    </td>

                    {/* NAME */}
                    <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {isInline ? (
                        <input
                          value={String(inlineDraft.name ?? '')}
                          onChange={(e) => setInlineDraft((d) => ({ ...d, name: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      ) : (
                        cafe.name
                      )}
                    </td>

                    {/* LOCATION */}
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {isInline ? (
                        <input
                          value={String(inlineDraft.location ?? '')}
                          onChange={(e) => setInlineDraft((d) => ({ ...d, location: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      ) : (
                        cafe.location
                      )}
                    </td>

                    {/* STATUS with quick toggle */}
                    <td className="px-6 py-2 whitespace-nowrap text-sm">
                      {isInline ? (
                        <select
                          value={(inlineDraft.is_active ?? true) ? 'true' : 'false'}
                          onChange={(e) =>
                            setInlineDraft((d) => ({ ...d, is_active: e.target.value === 'true' }))
                          }
                          className="px-2 py-1 border rounded"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => toggleActive(cafe)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition ${
                            (cafe.is_active ?? true)
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/60'
                              : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                          title="Click to toggle"
                        >
                          {(cafe.is_active ?? true) ? 'Active' : 'Inactive'}
                        </button>
                      )}
                    </td>

                    {/* STALL COUNT */}
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {count}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-2 whitespace-nowrap text-sm space-x-2">
                      {!isInline ? (
                        <>
                          <button
                            onClick={() => openModal(cafe)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => startInline(cafe)}
                            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1"
                            title="Inline edit"
                          >
                            <PencilLine className="h-4 w-4" />
                            Inline
                          </button>
                          <button
                            onClick={() => handleDeleteCafe(cafe.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => saveInline(cafe.id)}
                            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1 font-medium"
                          >
                            <Check className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={cancelInline}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 inline-flex items-center gap-1"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-500 text-sm">
              No cafés found.
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cafe-modal-title"
        >
          <div 
            className="card max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') closeModal();
            }}
            tabIndex={-1}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="cafe-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">{editingItem ? 'Edit Café' : 'Add New Café'}</h3>
              <button 
                onClick={closeModal} 
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  value={cafeForm.name || ''}
                  onChange={(e) => setCafeForm({ ...cafeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                <input
                  value={cafeForm.location || ''}
                  onChange={(e) => setCafeForm({ ...cafeForm, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={(cafeForm.is_active ?? true) ? 'true' : 'false'}
                  onChange={(e) => setCafeForm({ ...cafeForm, is_active: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (internal)</label>
                <textarea
                  value={cafeForm.notes || ''}
                  onChange={(e) => setCafeForm({ ...cafeForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={closeModal}
                className="min-h-[44px] px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label="Cancel and close"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCafe}
                className="min-h-[44px] px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 inline-flex items-center justify-center gap-2"
                aria-label={editingItem ? 'Save café changes' : 'Create new café'}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
