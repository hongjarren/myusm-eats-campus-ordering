import { useEffect, useState } from 'react';
import { supabase, MenuItem } from '../../lib/supabase';
import { Save, Utensils } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EditMenuItemProps {
  item: MenuItem;
  onClose: () => void;
  onItemUpdated: (item: any) => void;
}

export function EditMenuItem({ item, onClose, onItemUpdated }: EditMenuItemProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: item.name,
    price: String(item.price),
    description: item.description || '',
    prep_time: String(item.prep_time || '')
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState(item.category || '');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('category')
        .eq('stallid', item.stallid); // Use item.stallid
      
      if (data) {
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
  }, [item.stallid]);

  const handleImageUpload = async (file: File) => {
    // We can re-use the same storage policy path
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
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price.');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = item.image_url;
      if (imageFile) {
        try {
          imageUrl = await handleImageUpload(imageFile);
          // TODO: You might want to delete the old image from storage here
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          // Decide if you want to stop or continue without the new image
        }
      }

      const prepTimeInMinutes = parseInt(formData.prep_time) || 0;
      const { data: updatedItem, error } = await supabase
        .from('menu_items')
        .update({
          name: formData.name,
          price: price,
          description: formData.description || null,
          image_url: imageUrl,
          category: category.trim() || null,
          prep_time: prepTimeInMinutes
        })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      onItemUpdated(updatedItem);
      onClose();

    } catch (error: any) {
      console.error('Error updating item:', error);
      alert(`Failed to update item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center py-8">
        <Utensils className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Menu Item</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (RM)</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
              onBlur={() => setTimeout(() => setIsCategoryOpen(false), 150)}
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Change Image (Optional)</label>
          {/* Show the current image */}
          {item.image_url && !imageFile && (
            <img src={item.image_url} alt="Current" className="w-24 h-24 rounded-lg object-cover mb-2" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                setImageFile(e.target.files[0]);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <p className="text-xs text-gray-500 mt-1">Select a new image to replace the old one.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}