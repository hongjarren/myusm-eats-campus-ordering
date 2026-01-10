import { useState } from 'react';
import { supabase, Stall } from '../../lib/supabase';
import { Store, Save, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface EditStallProps {
  stall: (Stall & { location?: string });
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

// Days and time options
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`);

export function EditStall({ stall, onClose, showToast }: EditStallProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stallName, setStallName] = useState(stall.stallname || '');
  const [contact, setContact] = useState(stall.contact || '');
  const [description, setDescription] = useState(stall.description || '');

  // State for new operating hours
  const [selectedDays, setSelectedDays] = useState<string[]>(stall.operation_days || []);
  const [openTime, setOpenTime] = useState(stall.open_time || '08:00');
  const [closeTime, setCloseTime] = useState(stall.close_time || '18:00');
  const [isDaysOpen, setIsDaysOpen] = useState(false);

  //Add state for image file and preview
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(stall.imageurl);

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 text-center">
        <p className="text-red-600">User not found. Please log in again.</p>
      </div>
    );
  }

  // Add the image upload handler
  const handleImageUpload = async (file: File) => {
    if (!profile) throw new Error("User not found");

    // Use a unique path for this stall
    const filePath = `stalls/${profile.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('images') // Assuming your bucket is named 'images'
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Add file change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = stall.imageurl; // Default to old image

      // Check if a new image was uploaded
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);

        // Optional: Delete the old image from storage
        if (stall.imageurl) {
          const oldFileKey = stall.imageurl.split('/stalls/')[1];
          if (oldFileKey) {
            await supabase.storage.from('images').remove([`stalls/${oldFileKey}`]);
          }
        }
      }

      const { error } = await supabase
        .from('stall_update_requests')
        .insert({
          stall_id: stall.id,
          vendor_id: profile.id,
          new_stallname: stallName,
          new_contact: contact || null,
          new_operation_days: selectedDays,
          new_open_time: openTime,
          new_close_time: closeTime,
          new_imageurl: imageUrl,
          new_description: description,
        });

      if (error) throw error;

      showToast('Request submitted for approval.', 'success');
      onClose();

    } catch (error: any) {
      console.error('Error updating stall:', error);
      alert(`Failed to update stall: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center py-8">
        <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Manage Your Stall</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Update your stall's details</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stall Image</label>
        <div className="flex items-center gap-4 mt-2">

          {/* Image Preview */}
          <div className="w-32 h-32 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Stall preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="h-10 w-10 text-gray-400" />
            )}
          </div>

          {/* File Input Button */}
          <label className="cursor-pointer bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold text-sm py-2 px-4 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            Choose File
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Show file name if selected */}
          {imageFile && (
            <span className="text-sm text-gray-600 dark:text-gray-400">{imageFile.name}</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-6">
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stall Name</label>
          <input
            type="text"
            required
            value={stallName}
            onChange={(e) => setStallName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* --- NEW OPERATING DAYS SELECTOR --- */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operating Days</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDaysOpen((v) => !v)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-700"
            >
              <span className="text-gray-700 dark:text-white">{selectedDays.length === 0 ? 'Select days' : selectedDays.join(', ')}</span>
              <svg className={`h-4 w-4 text-gray-500 options-transform ${isDaysOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
            </button>
            {isDaysOpen && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                {DAYS.map((d) => {
                  const checked = selectedDays.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-800 dark:text-white">
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

        {/* --- NEW TIME SELECTORS --- */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Opens</label>
            <select value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Closes</label>
            <select value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Number</label>
          <input
            type="text"
            placeholder="e.g., 012-3456789"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="A short description of your stall..."
          />
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
              <span>Submit for Approval</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}