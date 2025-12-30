import { useState } from 'react';
import { supabase, Order } from '../../lib/supabase';
import { Loader2, CheckCircle, Truck, ShoppingBag } from 'lucide-react';
import { useToast } from '../Admin/useToast';

// 1. Using your preferred color scheme
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
    case 'preparing':
      return 'bg-yellow-100 text-yellow-800';
    case 'ready':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  showActions: boolean;
}

export function OrderCard({ order, onStatusUpdate, showActions }: OrderCardProps) {
  const [loading, setLoading] = useState<null | 'ready' | 'completed'>(null);
  const { showToast } = useToast();

  const handleUpdateStatus = async (newStatus: 'ready' | 'completed') => {
    setLoading(newStatus);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id)
        .select()
        .single();
      
      if (error) throw error;
      
      onStatusUpdate(data.id, data.status); 
      showToast(`Order marked as ${newStatus}.`, 'success');

    } catch (error: any) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3 flex flex-col h-full">
      
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">
          Order #{order.order_number || order.id.substring(0, 8)}
        </h3>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>
      
      {/* Date and Delivery Type Row */}
      <div className="flex justify-between items-center -mt-2">
        <p className="text-xs text-gray-500">
          {new Date(order.created_at).toLocaleString('en-US', {
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
        
        <div className={`flex items-center gap-1 text-xs font-medium ${
          order.delivery_type === 'delivery' ? 'text-blue-600' : 'text-purple-600'
        }`}>
          {order.delivery_type === 'delivery' ? 
            <Truck className="h-3 w-3" /> : 
            <ShoppingBag className="h-3 w-3" />
          }
          <span className="capitalize">{order.delivery_type}</span>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-3 space-y-2 flex-1">
        {order.order_items.map(item => (
          <div key={item.id} className="text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">
                {item.quantity}x {item.menu_items?.name || 'Menu Item'}
              </span>
              <span className="text-gray-700">RM {item.price.toFixed(2)}</span>
            </div>
            {item.special_instructions && (
              <p className="text-xs text-gray-500 italic ml-4">
                - {item.special_instructions}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {/* --- THIS IS THE CORRECTED BUTTON LOGIC --- */}
      {/* --- Corrected Button Logic --- */}
      {showActions && (
        <div className="mt-2">
          
          {/* 1. Show "Mark as Ready" if status is pending OR preparing */}
          {/* This applies to BOTH delivery and pickup orders */}
          {(order.status === 'pending' || order.status === 'preparing') && (
            <button
              onClick={() => handleUpdateStatus('ready')}
              disabled={loading === 'ready'}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              {loading === 'ready' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Mark as Ready'
              )}
            </button>
          )}

          {/* 2. Show "Mark as Completed" ONLY if status is 'ready' AND type is 'pickup' */}
          {/* This will only show *after* you have marked a pickup order as 'ready' */}
          {order.status === 'ready' && order.delivery_type === 'pickup' && (
            <button
              onClick={() => handleUpdateStatus('completed')}
              disabled={loading === 'completed'}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              {loading === 'completed' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>Mark as Completed</span>
            </button>
          )}

          {/* Note: If status is 'ready' and type is 'delivery', no button shows, which is correct. */}
        </div>
      )}
    </div>
  );
}