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
  emptyMessage = "No orders in this category.",
  showActions,
  gridCols = 2
}: OrderListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-blue-600 hover:text-blue-700 font-medium text-sm whitespace-nowrap">
            View All
          </Link>
        )}
      </div>

      {orders.length > 0 ? (
        <div className={`grid grid-cols-1 ${gridCols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-2'
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
        <div className="text-center py-12 flex flex-col items-center justify-center min-h-[300px]">
          <ShoppingBag className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-400 dark:text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}