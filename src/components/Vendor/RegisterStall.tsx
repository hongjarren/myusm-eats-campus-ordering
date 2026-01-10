import { useEffect, useState } from 'react';
import { Store, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface RegisterStallProps {
  onRegistered: (stall: any) => void;
}

export function RegisterStall({ onRegistered }: RegisterStallProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '', // Optional field
    contact: ''
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationOptions, setLocationOptions] = useState<{ id: string; name: string }[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null); // State for the uploaded image
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeOptions = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`);

  useEffect(() => {
    const loadLocations = async () => {
      // Select both id and name
      const { data } = await supabase.from('cafes').select('id, name'); // <--- CHANGED
      if (data) {
        // Remove duplicates and filter out any without a name
        const uniqueLocations = Array.from(new Map((data as any[]).map(c => [c.id, c])).values())
          .filter(c => c.name);
        setLocationOptions(uniqueLocations as any); // <--- CHANGED
      }
    };
    loadLocations();
  }, []);

  const handleImageUpload = async (file: File) => {
    const filePath = `stalls/${profile?.id}/${Date.now()}-${file.name}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Detailed upload error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCafeId) {
      alert('Please select a cafe location.');
      return;
    }

    if (selectedDays.length === 0) {
      alert('Please select at least one operating day.');
      return;
    }

    setLoading(true);

    try {
      // First try to upload image if one is selected
      let imageUrl = null;
      if (imageFile) {
        try {
          imageUrl = await handleImageUpload(imageFile);
        } catch (imageError) {
          console.error('Image upload failed:', imageError);
          // Continue without image if upload fails
        }
      }

      // Create stall record
      const { data: newStall, error: stallError } = await supabase
        .from('stall')
        .insert([
          {
            stallname: formData.name,
            description: formData.description || null,
            imageurl: imageUrl,
            cafeid: selectedCafeId,
            vendorid: profile?.id,
            operation_days: selectedDays,
            open_time: openTime,
            close_time: closeTime,
            stall_status: 'Online',
            contact: formData.contact
          }
        ])
        .select()   // <-- Get the new stall data back
        .single(); // <-- As a single object

      if (stallError) {
        console.error('Stall creation error:', stallError);
        throw stallError;
      }

      onRegistered(newStall);
    } catch (error: any) {
      console.error('Detailed error:', error);
      alert(`Registration failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center py-8">
        <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Register Your Stall</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Fill in your stall details to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stall Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operating Days</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDaysOpen((v) => !v)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700"
            >
              <span className="text-gray-700 dark:text-white">{selectedDays.length === 0 ? 'Select days' : selectedDays.join(', ')}</span>
              <svg className={`h-4 w-4 text-gray-500 transition-transform ${isDaysOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
            </button>
            {isDaysOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                {days.map((d) => {
                  const checked = selectedDays.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={(e) => setSelectedDays((prev) => e.target.checked ? [...prev, d] : prev.filter(x => x !== d))}
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{d}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opens</label>
            <select value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closes</label>
            <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLocationOpen((v) => !v)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700"
            >
              <span className="text-gray-700 dark:text-white">{formData.location || 'Select location'}</span>
              <svg className={`h-4 w-4 text-gray-500 transition-transform ${isLocationOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
            </button>
            {isLocationOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-auto">
                {locationOptions.map((opt) => (
                  <button
                    key={opt.id} // <-- Use ID for key
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, location: opt.name }); // Set name for display
                      setSelectedCafeId(opt.id); // <-- ADDED: Set the ID
                      setIsLocationOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200"
                  >
                    {opt.name} {/* <-- Show name */}
                  </button>
                ))}
                {locationOptions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No locations available</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
          <input
            type="text"
            required
            placeholder="e.g., 012-3456789"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                setImageFile(e.target.files[0]); // Set the selected image file
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              <span>Register Stall</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}