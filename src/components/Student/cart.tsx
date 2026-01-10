import { useEffect, useState } from 'react'; 
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Trash2, Edit, X, Plus, Minus } from 'lucide-react';

interface CartItem {
  id: string;
  quantity: number;
  instruction?: string;
  profile: string;
  menu: {
    id: string;
    name: string;
    description?: string;
    price: number;
    prep_time?: string;
    image_url?: string;
    stallid: {
      id: string;
      stallname: string;
      // include status from stall table
      stall_status?: 'Offline' | 'Online' | 'Busy';
    };
  };
}

export function Cart({
  onBack,
  onCheckout,
}: {
  onBack: () => void;
  onCheckout: (stall: string, items: any[], total: number) => void;
}) {  const { profile } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editInstruction, setEditInstruction] = useState<string>('');

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStall, setSelectedStall] = useState<{ id: string; name: string; status?: 'Offline' | 'Online' | 'Busy' } | null>(null);

  // Busy warning popup state
  const [busyWarn, setBusyWarn] = useState<{ show: boolean; stallName: string } | null>(null);

  useEffect(() => {
    if (profile?.id) fetchCartItems(profile.id);
  }, [profile]);

  const fetchCartItems = async (profileId: string) => {
    setLoading(true);
    const { data, error } = await supabase
  .from('cart')
  .select(`
    id,
    quantity,
    instruction,
    profile,
    menu (
      id,
      name,
      description,
      price,
      prep_time,
      image_url,
      stallid (
        id,
        stallname,
        stall_status
      )
    )
  `)
  .eq('profile', profileId);


    if (error) {
      console.error('Error fetching cart:', error.message);
    } else {
      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        instruction: item.instruction,
        profile: item.profile,
        menu: item.menu,
      }));
      setCartItems(formatted);
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    const confirmDelete = window.confirm('Remove this item from your cart?');
    if (!confirmDelete) return;

    const { error } = await supabase.from('cart').delete().eq('id', id);

    if (error) {
      console.error('Error removing item:', error.message);
      alert('Failed to remove item. Please try again.');
    } else {
      setCartItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedItems((prev) => prev.filter((itemId) => itemId !== id));
    }
  };

  const handleEdit = (item: CartItem) => {
    setEditingItem(item);
    setEditQuantity(item.quantity);
    setEditInstruction(item.instruction || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    const { error } = await supabase
      .from('cart')
      .update({ quantity: editQuantity, instruction: editInstruction })
      .eq('id', editingItem.id);

    if (error) {
      console.error('Error updating cart item:', error.message);
      alert('Failed to update item. Please try again.');
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, quantity: editQuantity, instruction: editInstruction }
            : item
        )
      );
      setEditingItem(null);
    }
  };

  // helper for status badge classes
  const badgeCls = (status?: 'Offline' | 'Online' | 'Busy') =>
    [
      'text-xs px-2 py-0.5 rounded-full border',
      status === 'Online'
        ? 'bg-green-100 text-green-700 border-green-200'
        : status === 'Busy'
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-gray-100 text-gray-600 border-gray-200',
    ].join(' ');

  const toggleSelectItem = (item: CartItem) => {
    const stallInfo = {
      id: item.menu.stallid?.id,
      name: item.menu.stallid?.stallname || 'Unknown Stall',
      status: item.menu.stallid?.stall_status as any,
    };

    // Block selection for Offline stalls
    if (stallInfo.status === 'Offline') {
      alert(`${stallInfo.name} is currently Offline.`);
      return;
    }

    if (!selectedStall) {
      setSelectedStall(stallInfo);
      setSelectedItems([item.id]);
      return;
    }

    if (stallInfo.id === selectedStall.id) {
      setSelectedItems((prev) =>
        prev.includes(item.id)
          ? prev.filter((id) => id !== item.id)
          : [...prev, item.id]
      );
    }

    setTimeout(() => {
      setSelectedItems((prev) => {
        if (prev.length === 0) setSelectedStall(null);
        return prev;
      });
    }, 0);
  };


  const selectedTotal = cartItems
    .filter((item) => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.menu?.price || 0) * item.quantity, 0);

  const handleCheckout = () => {
    if (!selectedStall) return;

    if (selectedStall.status === 'Offline') {
      alert(`${selectedStall.name} is currently Offline. Please select another stall.`);
      return;
    }

    if (selectedStall.status === 'Busy') {
      setBusyWarn({ show: true, stallName: selectedStall.name });
      return;
    }

    const selected = cartItems.filter((item) => selectedItems.includes(item.id));
    onCheckout(selectedStall.id, selected, selectedTotal);
  };



  // Group by stall id so we can show status per group
  const grouped = cartItems.reduce((acc: Record<string, { id: string; name: string; status?: 'Offline' | 'Online' | 'Busy'; items: CartItem[] }>, item) => {
    const s = item.menu?.stallid;
    if (!s) return acc;
    if (!acc[s.id]) acc[s.id] = { id: s.id, name: s.stallname || 'Unknown Stall', status: s.stall_status, items: [] };
    acc[s.id].items.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Back
        </button>
      </div>

      <h2 className="text-2xl font-bold ml-4">Your Cart</h2>

      {loading ? (
        <p>Loading your cart...</p>
      ) : cartItems.length === 0 ? (
        <p className="text-gray-600">Your cart is empty.</p>
      ) : (
        <>
          {Object.values(grouped).map((group) => (
            <div key={group.id} className="mb-8">
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-800">{group.name}</h3>
                  <span className={badgeCls(group.status)}>{group.status ?? 'Offline'}</span>
                </div>
                 <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                   <input
                     type="checkbox"
                     disabled={group.status === 'Offline'}
                     className={`h-5 w-5 accent-blue-600 ${group.status === 'Offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
                     checked={group.items.every((i) => selectedItems.includes(i.id))}
                     onChange={() => {
                       if (group.status === 'Offline') return;
                       const allIds = group.items.map((i) => i.id);
                       const allSelected = allIds.every((id) => selectedItems.includes(id));
 
                       if (!selectedStall || selectedStall.id === group.id) {
                         setSelectedStall(
                           allSelected
                             ? null
                             : { id: group.id, name: group.name, status: group.status }
                         );
                         setSelectedItems((prev) =>
                           allSelected
                             ? prev.filter((id) => !allIds.includes(id))
                             : [...prev, ...allIds]
                         );
                       } else {
                         alert(
                           `You can only select items from one stall at a time (currently: ${selectedStall.name})`
                         );
                       }
 
                     }}
                   />
                   <span>Select All</span>
                 </label>
               </div>
 
               <div className="space-y-4">
                 {group.items.map((item) => (
                   <div
                     key={item.id}
                     className={`flex items-center justify-between bg-white shadow-sm border rounded-xl p-4 ${
                       selectedItems.includes(item.id)
                         ? 'border-blue-500'
                         : 'border-gray-200'
                     }`}
                   >
                     <input
                       type="checkbox"
                       checked={selectedItems.includes(item.id)}
                       disabled={
                         group.status === 'Offline' ||
                        (selectedStall !== null && selectedStall.id !== group.id)
                       }
 
                       onChange={() => toggleSelectItem(item)}
                       className={`mr-3 h-5 w-5 accent-blue-600 ${group.status === 'Offline' ? 'opacity-50 cursor-not-allowed' : ''}`}
                     />
 
                     <div className="flex items-center space-x-4 flex-1">
                       {item.menu?.image_url ? (
                         <img
                           src={item.menu.image_url}
                           alt={item.menu.name}
                           className="w-20 h-20 rounded-lg object-cover"
                         />
                       ) : (
                         <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                           No Image
                         </div>
                       )}
                       <div>
                         <p className="font-semibold text-gray-900">{item.menu.name}</p>
                         <p className="text-sm text-gray-600">
                           Preparation time: {item.menu.prep_time} minutes
                         </p>
                         <p className="text-sm text-gray-600">
                           Quantity: {item.quantity} × RM {item.menu.price.toFixed(2)}
                         </p>
                         {item.instruction && (
                           <p className="text-xs text-gray-500 italic">
                             Note: {item.instruction}
                           </p>
                         )}
                       </div>
                     </div>
 
                     <div className="flex flex-col items-end space-y-2">
                       <p className="font-semibold">
                         RM {(item.menu.price * item.quantity).toFixed(2)}
                       </p>
 
                       <button
                         onClick={() => handleEdit(item)}
                         className="text-blue-500 hover:text-blue-700 flex items-center text-sm"
                       >
                         <Edit className="w-4 h-4 mr-1" /> Edit
                       </button>
 
                       <button
                         onClick={() => handleRemove(item.id)}
                         className="text-red-500 hover:text-red-700 flex items-center text-sm"
                       >
                         <Trash2 className="w-4 h-4 mr-1" /> Remove
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           ))}

          <div className="border-t pt-4 text-right space-y-3">
            <p className="text-lg font-bold text-gray-800">
              Selected Total: RM {selectedTotal.toFixed(2)}
            </p>
            <button
              onClick={handleCheckout}
              className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
              disabled={
                selectedItems.length === 0 ||
                (selectedStall?.status === 'Offline')
              }
            >
              Checkout ({selectedItems.length} item
              {selectedItems.length !== 1 ? 's' : ''})
            </button>
          </div>
        </>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96 relative">
            <button
              onClick={() => setEditingItem(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit {editingItem.menu.name}
            </h3>

            {editingItem.menu.image_url && (
              <img
                src={editingItem.menu.image_url}
                alt={editingItem.menu.name}
                className="w-full h-40 object-cover rounded-md mb-3"
              />
            )}

            <div className="space-y-6 mt-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                <div className="inline-flex items-center border rounded-lg overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setEditQuantity((q) => Math.max(1, q - 1))}
                    disabled={editQuantity <= 1}
                    className={`px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed`}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="px-4 py-2 w-14 text-center select-none font-medium">
                    {editQuantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditQuantity((q) => q + 1)}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="E.g. less spicy, no onion..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Busy stall checkout warning */}
      {busyWarn?.show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Stall is Busy</h3>
            <p className="text-sm text-gray-700">
              {busyWarn.stallName} is currently Busy. Your order may take longer than usual.
              Do you still want to proceed?
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setBusyWarn(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedStall) return;
                  const selected = cartItems.filter((item) =>
                    selectedItems.includes(item.id)
                  );
                  onCheckout(selectedStall.id, selected, selectedTotal);
                  setBusyWarn(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
