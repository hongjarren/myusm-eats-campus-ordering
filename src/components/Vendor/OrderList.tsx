import { Order } from '../../lib/supabase';
import { OrderCard } from './OrderCard';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrderListProps {
  title: string;
  orders: Order[]; // This will now be a pre-filtered, pre-sorted list
  onUpdateStatus: (orderId: string, newStatus: string) => void;
  viewAllLink: string;
  emptyMessage?: string;
  showActions: boolean;
  gridCols?: number;
}

export function OrderList({ 
  title, 
  orders, 
  onUpdateStatus, 
  viewAllLink, 
  emptyMessage = "No orders in this category." ,
  showActions,
  gridCols = 2
}: OrderListProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <Link to={viewAllLink} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          View All
        </Link>
      </div>

      {orders.length > 0 ? (
        <div className={`grid grid-cols-1 ${
          gridCols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-2'
        } gap-4`}>
          {orders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              onStatusUpdate={onUpdateStatus} 
              showActions={showActions}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}