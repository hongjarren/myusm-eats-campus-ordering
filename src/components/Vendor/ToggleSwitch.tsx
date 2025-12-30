import { useState } from 'react';
import { supabase, MenuItem } from '../../lib/supabase';

interface ToggleSwitchProps {
  item: MenuItem;
}

export function ToggleSwitch({ item }: ToggleSwitchProps) {
  const [isChecked, setIsChecked] = useState(item.is_available);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckedState = e.target.checked;
    setLoading(true);
    setIsChecked(newCheckedState); // Optimistic update

    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: newCheckedState })
      .eq('id', item.id);
      
    if (error) {
      alert('Failed to update availability. Please try again.');
      setIsChecked(!newCheckedState); // Revert on error
    }
    setLoading(false);
  };

  return (
    <label className="flex flex-col items-center cursor-pointer">
      <span className="text-sm font-medium text-gray-700 mb-1">Available</span>
      <div className="relative">
        <input 
          type="checkbox" 
          className="sr-only" 
          checked={isChecked}
          onChange={handleToggle}
          disabled={loading}
        />
        <div className={`block w-14 h-8 rounded-full ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isChecked ? 'translate-x-6' : 'translate-x-0'}`}></div>
      </div>
    </label>
  );
}