import { useState, useEffect } from 'react';
import { supabase, Stall, MenuItem } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Utensils, Edit, Trash2, Clock} from 'lucide-react';
import { AddMenuItem } from './AddMenuItem'; 
import { EditMenuItem } from './EditMenuItem'; 
import { ToggleSwitch } from './ToggleSwitch'; 

export function ManageMenu() {
  const { profile } = useAuth();
  const [stall, setStall] = useState<Stall | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    // Fetch stall and then menu items
    const loadData = async () => {
      setLoading(true);
      if (!profile) return;

      const { data: stallData } = await supabase
        .from('stall')
        .select('*')
        .eq('vendorid', profile.id)
        .single();
      
      if (stallData) {
        setStall(stallData);
        await fetchMenuItems(stallData.id);
      }
      setLoading(false);
    };
    loadData();
  }, [profile]);

  const fetchMenuItems = async (stallId: string) => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('stallid', stallId)
      .order('name', { ascending: true });
    setMenuItems(data || []);
  };
  
  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);
        
      if (error) {
        alert(error.message);
      } else {
        setMenuItems(menuItems.filter(item => item.id !== itemId));
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }
  
  if (!stall) {
    return <div className="p-8">Stall not found.</div>;
  }

  const groupedItems = menuItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link to="/vendor/dashboard" className="flex items-center gap-2 text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Your Menu</h1>
        <button
          onClick={() => setShowAddItem(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add New Item
        </button>
      </div>

      {/* --- THIS IS THE CORRECTED RENDER LOGIC --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {menuItems.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Utensils className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="font-medium">No menu items found.</p>
            <p className="text-sm text-gray-500">Click "Add New Item" to get started.</p>
          </div>
        ) : (
          // 1. Iterate over the sorted categories
          sortedCategories.map(category => (
            <div key={category}>
              {/* 2. Display the category name */}
              <h2 className="text-xl font-semibold text-gray-800 bg-gray-50 p-4 border-b border-t border-gray-200">
                {category}
              </h2>
              
              {/* 3. Iterate over the items *in that category* */}
              <div className="divide-y divide-gray-200">
                {groupedItems[category].map(item => (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    {/* --- 1. LEFT: Image, Name, Price --- */}
                    <div className="flex items-center gap-4">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="h-16 w-16 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-md font-bold text-gray-800">RM {Number(item.price).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* --- 2. MIDDLE: Description (fills space) --- */}
                    <div className="flex-1 px-4 w-full md:w-auto">
                       <p className="text-sm text-gray-600 italic">{item.description}</p>
                    </div>

                    {/* --- 3. RIGHT: Controls --- */}
                    <div className="flex items-center gap-4 w-full md:w-auto flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{item.prep_time || 0} min</span>
                      </div>
                      <ToggleSwitch item={item} />
                      
                      <button 
                        onClick={() => setEditingItem(item)} 
                        className="p-2 rounded-full text-blue-600 hover:bg-blue-100 transition-colors"
                        title="Edit item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-2 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {/* --- END OF FIX --- */}
      
      {/* --- Modals --- */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddItem(false)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowAddItem(false)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center">×</button>
            <AddMenuItem
              stallId={stall.id}
              onClose={() => setShowAddItem(false)}
              onItemAdded={() => { // <-- No parameter needed
                // Refetch all items to get correct sorting and grouping
                fetchMenuItems(stall.id); 
                setShowAddItem(false);
              }}
            />
          </div>
        </div>
      )}
      
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingItem(null)} />
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            <button onClick={() => setEditingItem(null)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center">×</button>
            <EditMenuItem
              item={editingItem}
              onClose={() => setEditingItem(null)}
              onItemUpdated={() => { // <-- Parameter removed
                // Refetch all items to ensure categories are updated
                fetchMenuItems(stall.id);
                setEditingItem(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}