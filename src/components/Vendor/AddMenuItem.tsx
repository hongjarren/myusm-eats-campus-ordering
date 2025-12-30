import { useEffect, useState } from 'react';
import { Plus, Utensils } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddMenuItemProps {
  stallId: string; // The 'id' from the 'stall' table
  onClose: () => void;
  onItemAdded: (item: any) => void;
}

export function AddMenuItem({ stallId, onClose, onItemAdded }: AddMenuItemProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '', // Use string for easier input handling
    description: '',
    prep_time: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [category, setCategory] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('stallid', stallId);
      
      if (data) {
        // Get unique, non-null categories
        const uniqueCategories = Array.from(
          new Set(data.map(item => item.category).filter(Boolean))
        ) as string[];
        setCategoryOptions(uniqueCategories.sort());
      }

      if (error) { 
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, [stallId]);
  
  const handleImageUpload = async (file: File) => {
    // We use a path that will pass your existing storage policies
    const filePath = `cafes/${profile?.id}/menu_items/${Date.now()}-${file.name}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Validation ---
    if (!formData.name) {
      alert('Please enter a menu item name.');
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        try {
          imageUrl = await handleImageUpload(imageFile);
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          // Don't block, just log the error
        }
      }

      if (imageUrl === null) {
        imageUrl = 'https://mfhynioifujvzekbtgob.supabase.co/storage/v1/object/public/images/stalls/94d429e3-d96f-45c4-a1e8-4566da0ead68/png-clipart-menu-restaurant-icon-menu-icon-emblem-food.png';
      }

      const prepTimeInMinutes = parseInt(formData.prep_time) || 0; 
      const { data: newItem, error } = await supabase
        .from('menu_items')
        .insert([
          {
            stallid: stallId,
            name: formData.name,
            price: price,
            description: formData.description || null,
            image_url: imageUrl,
            is_available: true,
            category: category.trim() || null,
            prep_time: prepTimeInMinutes
          }
        ])
        .select()
        .single();

      if (error) throw error;
      onItemAdded(newItem);
      onClose();

    } catch (error: any) {
      console.error('Error adding menu item:', error);
      alert(`Failed to add item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center py-8">
        <Utensils className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add New Menu Item</h2>
        <p className="text-gray-600 mb-6">Fill in the item details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (RM)</label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="e.g., 5.50"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (minutes)</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="e.g., 10"
            value={formData.prep_time}
            onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g., Main Course, Drinks, etc."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              onFocus={() => setIsCategoryOpen(true)}
              onBlur={() => setTimeout(() => setIsCategoryOpen(false), 150)} // Delay to allow click
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            {isCategoryOpen && categoryOptions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                {categoryOptions
                  .filter(opt => opt.toLowerCase().includes(category.toLowerCase()))
                  .map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onMouseDown={() => {
                        setCategory(opt);
                        setIsCategoryOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {opt}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Select an existing category or type a new one.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                setImageFile(e.target.files[0]);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 mb-8"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>Add Item</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}