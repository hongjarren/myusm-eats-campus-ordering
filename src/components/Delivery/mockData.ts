import { DeliveryWithOrder } from './DeliveryDashboard';

const currentDate = new Date().toISOString();
const yesterdayDate = new Date(Date.now() - 86400000).toISOString();
const lastWeekDate = new Date(Date.now() - 7 * 86400000).toISOString();

// USM Campus area coordinates
const USM_LOCATIONS = {
  ENGINEERING: {
    CAFE_1: { lat: 5.3416, lng: 100.3015, name: "Engineering Cafe 1", address: "Ground Floor, Engineering Building 1" },
    CAFE_2: { lat: 5.3418, lng: 100.3018, name: "Engineering Cafe 2", address: "Block B, Engineering Complex" },
    BLOCK_A: { lat: 5.3420, lng: 100.3020 },
    BLOCK_B: { lat: 5.3422, lng: 100.3022 },
  },
  MAIN: {
    CAFE_1: { lat: 5.3570, lng: 100.3020, name: "Main Campus Cafe", address: "Main Campus Food Court" },
    BLOCK_A: { lat: 5.3572, lng: 100.3022 },
    BLOCK_B: { lat: 5.3574, lng: 100.3024 },
  },
  HEALTH: {
    CAFE_1: { lat: 5.3600, lng: 100.3040, name: "Health Campus Cafe", address: "Health Campus Food Court" },
    BLOCK_A: { lat: 5.3602, lng: 100.3042 },
  }
};

export const mockDeliveries: DeliveryWithOrder[] = [
  // Active Deliveries
  {
    id: "d1",
    order_id: "o1",
    status: "assigned",
    created_at: currentDate,
    pickup_time: null,
    delivery_time: null,
    current_location: null,
    last_location_update: null,
    status_history: [
      {
        status: "assigned",
        timestamp: currentDate,
        previous_status: null
      }
    ],
    order: {
      order_number: "ORD20251101001",
      delivery_address: "Block A, USM Engineering Campus",
      vendor_name: "Engineering Cafe 1",
      vendor_location: USM_LOCATIONS.ENGINEERING.CAFE_1,
      customer_location: USM_LOCATIONS.ENGINEERING.BLOCK_A,
      total: 25.50,
      payment_method: 'card',
      notes: 'No onions, please',
      items: [
        { name: 'Nasi Lemak', quantity: 1, price: 8.5 },
        { name: 'Iced Milo', quantity: 1, price: 3.0 },
        { name: 'Chicken Rendang', quantity: 1, price: 14.0 }
      ],
      customer: {
        full_name: "John Student",
        phone: "011-1234567"
      }
    }
  },
  {
    id: "d2",
    order_id: "o2",
    status: "picked_up",
    created_at: currentDate,
    pickup_time: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    delivery_time: null,
    current_location: { lat: 5.3416, lng: 100.3015 },
    last_location_update: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    status_history: [
      {
        status: "assigned",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        previous_status: null
      },
      {
        status: "picked_up",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        previous_status: "assigned"
      }
    ],
    order: {
      order_number: "ORD20251101002",
      delivery_address: "Block B, USM Main Campus",
      vendor_name: "Main Campus Cafe",
      vendor_location: USM_LOCATIONS.MAIN.CAFE_1,
      customer_location: USM_LOCATIONS.MAIN.BLOCK_B,
      total: 42.00,
      payment_method: 'wallet',
      notes: 'Please ring the bell',
      items: [
        { name: 'Spaghetti Carbonara', quantity: 1, price: 12.0 },
        { name: 'Garlic Bread', quantity: 2, price: 4.0 },
        { name: 'Lemon Tea', quantity: 2, price: 5.0 }
      ],
      customer: {
        full_name: "Sarah Lee",
        phone: "012-3456789"
      }
    }
  },
  {
    id: "d3",
    order_id: "o3",
    status: "en_route",
    created_at: currentDate,
    pickup_time: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    delivery_time: null,
    current_location: { lat: 5.3426, lng: 100.3025 },
    last_location_update: currentDate,
    status_history: [
      {
        status: "assigned",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        previous_status: null
      },
      {
        status: "picked_up",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        previous_status: "assigned"
      },
      {
        status: "en_route",
        timestamp: currentDate,
        previous_status: "picked_up"
      }
    ],
    order: {
      order_number: "ORD20251101003",
      delivery_address: "Block A, USM Health Campus",
      vendor_name: "Health Campus Cafe",
      vendor_location: USM_LOCATIONS.HEALTH.CAFE_1,
      customer_location: USM_LOCATIONS.HEALTH.BLOCK_A,
      total: 33.80,
      payment_method: 'card',
      notes: '',
      items: [
        { name: 'Chicken Rice', quantity: 1, price: 10.0 },
        { name: 'Fried Egg', quantity: 1, price: 2.8 },
        { name: 'Herbal Tea', quantity: 1, price: 7.0 }
      ],
      customer: {
        full_name: "Mike Wong",
        phone: "013-9876543"
      }
    }
  },
  // Completed Deliveries
  {
    id: "d4",
    order_id: "o4",
    status: "delivered",
    created_at: currentDate,
    pickup_time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    delivery_time: new Date(Date.now() - 5400000).toISOString(), // 1.5 hours ago
    current_location: { lat: 5.3436, lng: 100.3035 },
    last_location_update: new Date(Date.now() - 5400000).toISOString(),
    status_history: [
      {
        status: "assigned",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        previous_status: null
      },
      {
        status: "picked_up",
        timestamp: new Date(Date.now() - 6300000).toISOString(),
        previous_status: "assigned"
      },
      {
        status: "en_route",
        timestamp: new Date(Date.now() - 5700000).toISOString(),
        previous_status: "picked_up"
      },
      {
        status: "delivered",
        timestamp: new Date(Date.now() - 5400000).toISOString(),
        previous_status: "en_route"
      }
    ],
    order: {
      order_number: "ORD20251101004",
      delivery_address: "Block B, USM Engineering Campus",
      vendor_name: "Engineering Cafe 2",
      vendor_location: USM_LOCATIONS.ENGINEERING.CAFE_2,
      customer_location: USM_LOCATIONS.ENGINEERING.BLOCK_B,
      total: 56.90,
      payment_method: 'card',
      notes: 'Extra spicy',
      items: [
        { name: 'Mixed Grill', quantity: 1, price: 28.0 },
        { name: 'Fries', quantity: 2, price: 6.0 },
        { name: 'Chocolate Shake', quantity: 1, price: 6.9 }
      ],
      customer: {
        full_name: "Lisa Chan",
        phone: "014-7654321"
      }
    }
  },
  // Yesterday's Delivery
  {
    id: "d5",
    order_id: "o5",
    status: "delivered",
    created_at: yesterdayDate,
    pickup_time: yesterdayDate,
    delivery_time: yesterdayDate,
    current_location: { lat: 5.3446, lng: 100.3045 },
    last_location_update: yesterdayDate,
    status_history: [
      {
        status: "assigned",
        timestamp: yesterdayDate,
        previous_status: null
      },
      {
        status: "picked_up",
        timestamp: new Date(new Date(yesterdayDate).getTime() + 900000).toISOString(),
        previous_status: "assigned"
      },
      {
        status: "en_route",
        timestamp: new Date(new Date(yesterdayDate).getTime() + 1800000).toISOString(),
        previous_status: "picked_up"
      },
      {
        status: "delivered",
        timestamp: new Date(new Date(yesterdayDate).getTime() + 2700000).toISOString(),
        previous_status: "en_route"
      }
    ],
    order: {
      order_number: "ORD20251031001",
      delivery_address: "Block A, USM Main Campus",
      vendor_name: "Main Campus Cafe",
      vendor_location: USM_LOCATIONS.MAIN.CAFE_1,
      customer_location: USM_LOCATIONS.MAIN.BLOCK_A,
      total: 28.50,
      payment_method: 'cash',
      notes: '',
      items: [
        { name: 'Fish & Chips', quantity: 1, price: 12.5 },
        { name: 'Orange Juice', quantity: 1, price: 4.0 },
        { name: 'Cookie', quantity: 2, price: 6.0 }
      ],
      customer: {
        full_name: "Tom Tan",
        phone: "015-1234567"
      }
    }
  },
  // Last Week's Delivery
  {
    id: "d6",
    order_id: "o6",
    status: "delivered",
    created_at: lastWeekDate,
    pickup_time: lastWeekDate,
    delivery_time: lastWeekDate,
    current_location: { lat: 5.3456, lng: 100.3055 },
    last_location_update: lastWeekDate,
    status_history: [
      {
        status: "assigned",
        timestamp: lastWeekDate,
        previous_status: null
      },
      {
        status: "picked_up",
        timestamp: new Date(new Date(lastWeekDate).getTime() + 900000).toISOString(),
        previous_status: "assigned"
      },
      {
        status: "en_route",
        timestamp: new Date(new Date(lastWeekDate).getTime() + 1800000).toISOString(),
        previous_status: "picked_up"
      },
      {
        status: "delivered",
        timestamp: new Date(new Date(lastWeekDate).getTime() + 2700000).toISOString(),
        previous_status: "en_route"
      }
    ],
    order: {
      order_number: "ORD20251025001",
      delivery_address: "Block A, USM Health Campus",
      vendor_name: "Health Campus Cafe",
      vendor_location: USM_LOCATIONS.HEALTH.CAFE_1,
      customer_location: USM_LOCATIONS.HEALTH.BLOCK_A,
      total: 45.60,
      payment_method: 'wallet',
      notes: 'Leave at security',
      items: [
        { name: 'Beef Noodles', quantity: 1, price: 15.0 },
        { name: 'Spring Roll', quantity: 2, price: 6.0 },
        { name: 'Herbal Soup', quantity: 1, price: 19.6 }
      ],
      customer: {
        full_name: "Jenny Lim",
        phone: "016-9876543"
      }
    }
  }
];