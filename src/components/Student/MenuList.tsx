import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, ChevronDown, ChevronUp, X, Plus, Minus } from 'lucide-react';


interface Stall {
  id: string;
  stallname: string;
  description?: string;
  open_time?: string;
  close_time?: string;
  cafeid: string;
  vendorid: string;
  imageurl?: string;
  operation_days?: string;
  // add status column
  stall_status?: 'Offline' | 'Online' | 'Busy';
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  prep_time?: number;
  is_available: boolean;
  category?: string;
}

interface MenuListProps {
  cafeId: string;
  cafeName: string;
  onBack: () => void;
  onViewCart: () => void;
}

export function MenuList({ cafeId, cafeName, onBack, onViewCart}: MenuListProps) {
  const { profile } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [expandedStallId, setExpandedStallId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [instruction, setInstruction] = useState<string>('');
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [cartPopupInfo, setCartPopupInfo] = useState<{ name: string; quantity: number } | null>(null);


  // ✅ Load logged-in profile ID from AuthContext
  useEffect(() => {
    if (profile?.id) {
      setProfileId(profile.id);
    } else {
      console.warn('⚠️ Please login first');
    }
  }, [profile]);

  // ✅ Fetch stalls for this cafe
  useEffect(() => {
    const fetchStalls = async () => {
      const { data, error } = await supabase
        .from('stall')
        .select('*')
        .eq('cafeid', cafeId);

      if (error) console.error('Error fetching stalls:', error.message);
      else setStalls(data || []);
    };

    fetchStalls();
  }, [cafeId]);

  // ✅ Toggle menu section for each stall
  const toggleMenu = async (stallId: string) => {
    if (expandedStallId === stallId) {
      setExpandedStallId(null);
      return;
    }

    setExpandedStallId(stallId);
    if (!menuItems[stallId]) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('stallid', stallId);

      if (error) console.error('Error fetching menu items:', error.message);
      else setMenuItems((prev) => ({ ...prev, [stallId]: data || [] }));
    }
  };

  // ✅ Add to Cart
const handleAddToCart = async () => {
  if (!selectedMenu || !profileId) {
    alert('Please login first.');
    return;
  }

  const { error } = await supabase.from('cart').insert([
    {
      menu: selectedMenu.id,
      quantity,
      instruction,
      profile: profileId,
    },
  ]);

  if (error) {
    console.error('Failed to add to cart:', error.message);
    alert('❌ Failed to add to cart.');
  } else {
    // ✅ Show popup first, don't clear yet
    setCartPopupInfo({ name: selectedMenu.name, quantity });
    setShowCartPopup(true);
  }
};


  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Cafeterias
      </button>

        <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-bold">{cafeName}</h2>
    <div>
        <button
        onClick={
            onViewCart}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
        🛒 View Cart
        </button>
    </div>
    </div>

    
      {stalls.length > 0 ? (
        <div className="flex flex-col space-y-4">
          {stalls.map((stall) => (
            <div
              key={stall.id}
              className="border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center space-x-4">
                {stall.imageurl && (
                  <img
                    src={stall.imageurl}
                    alt={stall.stallname}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {stall.stallname}
                    </h3>
                    <span
                      className={[
                        'text-xs px-2 py-0.5 rounded-full border',
                        stall.stall_status === 'Online'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : stall.stall_status === 'Busy'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200',
                      ].join(' ')}
                    >
                      {stall.stall_status ?? 'Offline'}
                    </span>
                  </div>
                  {stall.open_time && (
                    <p className="text-sm text-gray-500">
                      🕒 {stall.open_time} to {stall.close_time}
                    </p>
                  )}
                  {stall.operation_days && (
                    <p className="text-sm text-gray-500">
                    🗓️ {
                          Array.isArray(stall.operation_days)
                            ? stall.operation_days.join(', ')
                            : stall.operation_days
                                .split(',')
                        }                    
                        </p>
                  )}
                  {stall.description && (
                    <p className="text-sm text-gray-600">💡:{stall.description}</p>
                  )}
                  
                </div>
                <button
                  onClick={() => toggleMenu(stall.id)}
                  className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {expandedStallId === stall.id ? (
                    <>
                      Hide Menu <ChevronUp className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      View Menu <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Menu Section */}
              {expandedStallId === stall.id && (
              <div className="mt-4 border-t pt-4 space-y-3 animate-fadeSlideIn origin-top">
                {menuItems[stall.id]?.length ? (
                  // ✅ Group items by category
                  Object.entries(
                    menuItems[stall.id].reduce((acc, item) => {
                      const category = item.category || 'Other';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(item);
                      return acc;
                    }, {} as Record<string, MenuItem[]>)
                  )
                    // ✅ Optional: sort categories alphabetically (except "Other" goes last)
                    .sort(([a], [b]) => {
                      if (a === 'Other') return 1;
                      if (b === 'Other') return -1;
                      return a.localeCompare(b);
                    })
                    .map(([category, items]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="text-lg font-semibold text-gray-800 border-b pb-1 animate-fadeSlideIn">
                          {category}
                        </h4>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center space-x-4 border rounded-lg p-3 hover:shadow-sm transition animate-fadeSlideIn"
                          >
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-md"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.description}</p>
                              <p className="text-sm text-gray-500">
                                Prep: {item.prep_time ?? 0} min
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-green-600">
                                RM {item.price.toFixed(2)}
                              </p>
                              <button
                                onClick={() => setSelectedMenu(item)}
                                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                              >
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-center">No menu items found.</p>
                )}
              </div>
            )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-center py-12">
          No stalls found for this cafeteria.
        </p>
      )}

      {/* 🛒 Add to Cart Modal */}
      {selectedMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96 relative">
            <button
              onClick={() => setSelectedMenu(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedMenu.name}
            </h3>
            <h4 className="font-medium text-gray-900">
             {selectedMenu.image_url && (
                          <img
                            src={selectedMenu.image_url}
                            alt={selectedMenu.name}
                            className="w-35 h-35 object-cover rounded-md"
                          />
                        )}
             <p className="text-sm text-gray-600">
                            {selectedMenu.description}
                          </p>
                          <p className="text-sm text-gray-500">
                            Prep: {selectedMenu.prep_time ?? 0} min
                          </p>
            </h4>
                          
            <div className="space-y-6 mt-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Quantity</label>
                <div className="inline-flex items-center border rounded-lg overflow-hidden shadow-sm select-none">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <div className="px-4 py-2 w-14 text-center font-medium">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
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
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="E.g. less spicy, no onion..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedMenu(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToCart}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Add to Cart
              </button>
            </div>

            
          </div>
          {showCartPopup && cartPopupInfo && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
              <div className="bg-white rounded-2xl shadow-lg p-6 w-80 text-center animate-fadeIn">
                <div className="text-green-500 text-5xl mb-3">✅</div>
                <h2 className="text-lg font-semibold mb-2">Item Added!</h2>
                <p className="text-sm text-gray-600 mb-1">
                  <b>{cartPopupInfo.name}</b>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Quantity: x{cartPopupInfo.quantity}
                </p>
                <button
                  onClick={() => {
                    // ✅ Now clear everything only after user confirms
                    setShowCartPopup(false);
                    setSelectedMenu(null);
                    setQuantity(1);
                    setInstruction('');
                    setCartPopupInfo(null);
                  }}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
                >
                  OK
                </button>
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
