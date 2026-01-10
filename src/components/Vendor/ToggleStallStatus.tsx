import { useState, useRef, useEffect } from 'react'; // <-- Add useRef and useEffect
import { supabase, Stall } from '../../lib/supabase';

// Define the possible statuses
const STATUS_OPTIONS = ['Online', 'Busy', 'Offline'];

// Helper to get color for status dot
const getStallStatusColor = (status: string) => {
  switch (status) {
    case 'Online':
      return 'bg-green-500';
    case 'Busy':
      return 'bg-yellow-500';
    case 'Offline':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

interface ToggleStallStatusProps {
  stall: Stall;
  onStatusUpdated: (newStatus: string) => void;
}

export function ToggleStallStatus({ stall, onStatusUpdated }: ToggleStallStatusProps) {
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for custom dropdown
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to detect clicks outside
  
  const currentStatus = stall.stall_status || 'Offline';

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus || loading) return;

    setLoading(true);
    setIsDropdownOpen(false); // Close dropdown immediately

    try {
      const { data, error } = await supabase
        .from('stall')
        .update({ stall_status: newStatus })
        .eq('id', stall.id)
        .select('stall_status')
        .single();

      if (error) throw error;
      if (data) {
        onStatusUpdated(data.stall_status as string);
      }
    } catch (error: any) {
      console.error('Error updating stall status:', error);
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="relative" ref={dropdownRef}> {/* Add ref here */}
      <button
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className={`flex items-center justify-center gap-2 bg-white/25 hover:bg-white/45 text-white rounded-full
                    px-4 py-2 pr-10 font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-white/50
                    w-28 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {/* Status dot */}
        <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getStallStatusColor(currentStatus)}`} />
        
        {/* Current status text */}
        <span>{currentStatus}</span>

        {/* Custom dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center px-3 text-white pointer-events-none">
          <svg className={`fill-current h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </button>

      {/* Custom Dropdown Panel */}
      {isDropdownOpen && (
<div className="absolute z-30 mt-2 w-40 bg-gray-600 border border-gray-200 rounded-lg shadow-lg overflow-hidden right-0 opacity-100 pointer-events-auto"> {/* <-- CHANGED Z-INDEX and added opacity/pointer-events */}          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => handleStatusChange(status)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors text-gray-200
                          ${currentStatus === status ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}
              disabled={loading}
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}