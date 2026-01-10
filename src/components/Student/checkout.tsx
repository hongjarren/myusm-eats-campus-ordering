import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  instruction?: string;
  image_url?: string;
  menu: string;
}

interface CheckoutProps {
  selectedStall: string;
  items: CheckoutItem[];
  total: number;
  onBack: () => void;
  onConfirm: () => void;
}

export function Checkout({
  selectedStall,
  items,
  total,
  onBack,
  onConfirm,
}: CheckoutProps) {
  const { profile } = useAuth() as any;
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery');
  const [address, setAddress] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [credit, setCredit] = useState<number>(0);
  const [isPaying, setIsPaying] = useState(false);
  const [showWalletPopup, setShowWalletPopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number | ''>('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showTopupSuccess, setShowTopupSuccess] = useState(false);
  const [orderSummary, setOrderSummary] = useState<{
    id: string;
    stall: string;
    type: string;
    subtotal: number;
    total: number;
    items: any[];
  } | null>(null);
  const DELIVERY_FEE = 3.0;

  useEffect(() => {
    if (profile?.id) fetchCredit(profile.id);
    if (profile?.hostel_address) setAddress(profile.hostel_address);
  }, [profile]);

  const fetchCredit = async (id: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('credit_balance, hostel_address')
      .eq('id', id)
      .single();

    if (!error && data?.credit_balance) setCredit(Number(data.credit_balance));
    if (!error && data?.hostel_address) setAddress(data.hostel_address);
  };

  const handleConfirmPayment = async () => {
    const totalAmount = deliveryType === 'delivery' ? total + DELIVERY_FEE : total;

    if (deliveryType === 'delivery' && !address.trim()) {
      alert('Please enter your delivery address.');
      return;
    }

    if (credit < totalAmount) {
      setShowWalletPopup(true);
      return;
    }

    setIsPaying(true);

    try {
      const newBalance = credit - totalAmount;
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({
          credit_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (balanceError) throw balanceError;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: profile.id,
            stall_id: selectedStall,
            status: 'pending',
            delivery_type: deliveryType,
            delivery_address: deliveryType === 'delivery' ? address : null,
            subtotal: total,
            notes_to_driver: note || null,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: newOrder.id,
        menu_item_id: item.menu,
        quantity: item.quantity,
        price: item.price,
        special_instructions: item.instruction || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const itemIds = items.map((i) => i.id);
      await supabase.from('cart').delete().in('id', itemIds);

      setCredit(newBalance);

      // ✅ Instead of alert — show order summary popup
      setOrderSummary({
        id: newOrder.id,
        stall: selectedStall,
        type: deliveryType,
        total: totalAmount,
        subtotal: total,
        items: items,
      });
      setShowSuccessPopup(true);
    } catch (err: any) {
      console.error('❌ Checkout failed:', err);
      alert(`Checkout failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleTopupConfirm = async () => {
    if (!topupAmount || topupAmount <= 0) {
      alert('Please enter a valid top-up amount.');
      return;
    }

    const newBalance = credit + topupAmount;
    const { error } = await supabase
      .from('profiles')
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) {
      alert('Top-up failed.');
      return;
    }
    else {
    setCredit(credit + topupAmount);
    setShowWalletPopup(false);
    setShowTopupSuccess(true); // ✅ show success popup
    setTopupAmount('');
  }

    
  };

  const handleBackToHome = () => {
    setShowSuccessPopup(false);
    onConfirm();
  };

  const totalWithDelivery = deliveryType === 'delivery' ? total + DELIVERY_FEE : total;
  const isBalanceEnough = credit >= totalWithDelivery;

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-3 text-gray-600 hover:text-black">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold">Checkout</h2>
      </div>

      {/* Delivery / Pickup */}
      <div className="flex space-x-3 mb-6">
        <button
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            deliveryType === 'delivery'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setDeliveryType('delivery')}
        >
          Delivery
        </button>
        <button
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            deliveryType === 'pickup'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
          onClick={() => setDeliveryType('pickup')}
        >
          Pick Up
          </button>
        </div>
  
        {/* Address */}
        {deliveryType === 'delivery' && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center mb-2">
          <MapPin className="text-green-600 mr-2" size={20} />
          <h4 className="font-semibold text-gray-700">Delivery Address</h4>
            </div>
            <select
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
          <option value="">Select your delivery address</option>
          <option value="Desasiswa Aman Damai">Desasiswa Aman Damai</option>
          <option value="Desasiswa Bakti Permai">Desasiswa Bakti Permai</option>
          <option value="Desasiswa Cahaya Gemilang">Desasiswa Cahaya Gemilang</option>
          <option value="Desasiswa Fajar Harapan">Desasiswa Fajar Harapan</option>
          <option value="Desasiswa Indah Kembara">Desasiswa Indah Kembara</option>
          <option value="Desasiswa Restu">Desasiswa Restu</option>
          <option value="Desasiswa Saujana">Desasiswa Saujana</option>
          <option value="Desasiswa Tekun">Desasiswa Tekun</option>
          <option value="International House USM">International House USM</option>
            </select>
          </div>
        )}

        {/* Order Summary */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h4 className="font-semibold text-lg mb-3 text-gray-700">Order Summary</h4>
        {items.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No items in order.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-start border-b last:border-none py-3"
            >
              <div className="flex items-start space-x-3 w-full">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                    🍽
                  </div>
                )}

                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.instruction && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      Note: {item.instruction}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">Quantity: x{item.quantity}</p>
                </div>

                <p className="font-semibold text-right whitespace-nowrap">
                  RM {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Note */}
      <div className="mb-6">
        <h4 className="font-semibold mb-2 text-gray-700">Additional Note</h4>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any special instructions..."
          className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          rows={2}
        />
      </div>

      {/* Total */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between mb-2">
          <span>Order Amount</span>
          <span>RM {total.toFixed(2)}</span>
        </div>
        {deliveryType === 'delivery' && (
          <div className="flex justify-between mb-2">
            <span>Delivery Fee</span>
            <span>RM {DELIVERY_FEE.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t pt-2 mb-3">
          <span>Grand Total</span>
          <span>RM {totalWithDelivery.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Wallet Balance</span>
          <span
            className={`font-bold ${
              isBalanceEnough ? 'text-green-700' : 'text-red-600'
            }`}
          >
            RM {credit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Confirm / Top-up */}
      {!isBalanceEnough ? (
        <button
          onClick={() => setShowWalletPopup(true)}
          className="w-full bg-yellow-500 text-white font-semibold py-3 rounded-lg hover:bg-yellow-600 transition"
        >
          Top Up Wallet
        </button>
      ) : (
        <button
          onClick={handleConfirmPayment}
          disabled={isPaying}
          className={`w-full font-semibold py-3 rounded-lg transition ${
            isPaying
              ? 'bg-gray-400 text-white'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isPaying ? 'Processing...' : 'Confirm Payment'}
        </button>
      )}

      {/* 💰 Wallet Top-up Popup */}
      {showWalletPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white w-full max-w-sm p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Wallet Top-Up</h3>
            <div className="flex gap-2 mb-3">
              {[10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt)}
                  className={`flex-1 py-2 border rounded ${
                    topupAmount === amt ? 'bg-green-100 border-green-500' : ''
                  }`}
                >
                  RM{amt}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              step="0.01"
              placeholder="Custom amount (RM)"
              value={topupAmount === '' ? '' : String(topupAmount)}
              onChange={(e) =>
                setTopupAmount(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <p className="text-sm text-gray-600 mb-4">
              Current balance: RM {credit.toFixed(2)}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowWalletPopup(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleTopupConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Top-up Successful Popup */}
      {showTopupSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl p-6 shadow-lg w-80 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12 text-green-500 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h2 className="text-lg font-semibold mb-2">Top-up Successful!</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your wallet has been credited successfully 🎉
            </p>
            <button
              onClick={() => setShowTopupSuccess(false)}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}


      {/* ✅ Success Popup */}
      {showSuccessPopup && orderSummary && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
    <div className="bg-white rounded-2xl shadow-lg p-6 w-96 text-center animate-fadeIn">
      <CheckCircle className="text-green-500 w-12 h-12 mx-auto mb-3" />
      <h2 className="text-lg font-semibold mb-2">Order Successful!</h2>

      {/* 🧾 Basic Info */}
      <p className="text-sm text-gray-600 mb-1">
        <b>Order ID:</b> {orderSummary.id}
      </p>
      <p className="text-sm text-gray-600 mb-2">
        <b>Type:</b> {orderSummary.type === 'delivery' ? 'Delivery' : 'Pickup'}
      </p>

      {/* 🛒 Ordered Items */}
      <div className="mt-3 mb-3 text-left border-t border-gray-200 pt-2">
        <p className="text-sm font-semibold mb-1">Items Ordered:</p>
        <div className="max-h-40 overflow-y-auto px-2">
          {orderSummary.items.map((item, index) => (
            <div
              key={index}
              className="flex justify-between text-sm text-gray-700 py-1 border-b border-gray-100"
            >
              <span className="truncate max-w-[120px]">{item.name}</span>
              <span>x{item.quantity}</span>
              <span>RM{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 💰 Order Cost Summary */}
      <div className="border-t border-gray-200 pt-2 text-sm text-gray-800">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>RM {orderSummary.subtotal.toFixed(2)}</span>
        </div>

        {orderSummary.type === 'delivery' && (
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>RM 3.00</span>
          </div>
        )}

        <div className="flex justify-between font-semibold mt-1 border-t border-gray-100 pt-1">
          <span>Total</span>
          <span>RM {orderSummary.total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={handleBackToHome}
        className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
      >
        Back to Home
      </button>
    </div>
  </div>
)}

    </div>
  );
}
