'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// Order item interface with preparation status
interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  isPrepared: boolean;
}

// Order interface 
interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  items: OrderItem[];
}

export default function PrepareOrderPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparationProgress, setPreparationProgress] = useState(0);

  // Load order data from database
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const { supabase } = await import('../../lib/supabase/client');
        
        // Get order with its items and product details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            customer_name,
            customer_phone,
            total_amount,
            order_items (
              id,
              quantity,
              unit_price,
              custom_image_url,
              products (
                id,
                name,
                main_image_url
              )
            )
          `)
          .eq('order_number', orderId)
          .single();

        if (orderError) {
          console.error('Error fetching order:', orderError);
          return;
        }

        // Transform data to match our Order interface
        const transformedOrder: Order = {
          id: orderData.order_number,
          customerName: orderData.customer_name || 'عميل غير محدد',
          customerPhone: orderData.customer_phone,
          total: Number(orderData.total_amount),
          items: orderData.order_items.map((item: any) => ({
            id: String(item.id),
            name: item.products?.name || 'منتج غير معروف',
            quantity: item.quantity,
            price: Number(item.unit_price),
            image: item.custom_image_url || item.products?.main_image_url || undefined,
            isPrepared: false
          }))
        };

        setOrder(transformedOrder);
        setLoading(false);
      } catch (error) {
        console.error('Error loading order:', error);
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  // Calculate preparation progress
  useEffect(() => {
    if (order) {
      const preparedItems = order.items.filter(item => item.isPrepared).length;
      const totalItems = order.items.length;
      const progress = totalItems > 0 ? (preparedItems / totalItems) * 100 : 0;
      setPreparationProgress(progress);
    }
  }, [order]);

  // Toggle item preparation status
  const toggleItemPreparation = (itemId: string) => {
    if (!order) return;
    
    setOrder(prevOrder => ({
      ...prevOrder!,
      items: prevOrder!.items.map(item =>
        item.id === itemId ? { ...item, isPrepared: !item.isPrepared } : item
      )
    }));
  };

  // Complete order preparation
  const completeOrder = async () => {
    if (!order) return;
    
    try {
      const { supabase } = await import('../../lib/supabase/client');
      
      // Update order status to completed
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('order_number', orderId);

      if (error) {
        console.error('Error completing order:', error);
        return;
      }

      // Close the window and return to main page
      alert('تم إكمال الطلب بنجاح!');
      window.close();
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الطلب...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">طلب غير موجود</h2>
          <p className="text-gray-600">لم يتم العثور على الطلب المطلوب</p>
        </div>
      </div>
    );
  }

  const allItemsPrepared = order.items.every(item => item.isPrepared);

  return (
    <div className="min-h-screen bg-gray-100 p-6" dir="rtl">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">تحضير الطلب</h1>
        
        {/* Customer Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <div className="text-right">
            <h2 className="text-lg font-semibold text-gray-800">العميل: {order.customerName}</h2>
            <p className="text-gray-600">رقم الطلب: {order.id}</p>
            {order.customerPhone && (
              <p className="text-gray-600">الهاتف: {order.customerPhone}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">تقدم التحضير</span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(preparationProgress)}% مكتمل
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-green-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${preparationProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {order.items.filter(item => item.isPrepared).length} من {order.items.length} منتج
          </p>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">قائمة المنتجات للتحضير</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {order.items.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white rounded-lg p-4 shadow-sm border-2 transition-all cursor-pointer ${
                item.isPrepared 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => toggleItemPreparation(item.id)}
            >
              <div className="flex items-center gap-4">
                {/* Product Image */}
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-gray-400 text-2xl">📦</span>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{item.name}</h4>
                  <p className="text-gray-600">الكمية: {item.quantity} قطعة</p>
                  <p className="text-gray-600">السعر الواحد: {item.price.toFixed(2)} جنيه</p>
                  <p className="text-gray-600">الإجمالي: {(item.price * item.quantity).toFixed(2)} جنيه</p>
                </div>

                {/* Preparation Status */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.isPrepared ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {item.isPrepared ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${
                    item.isPrepared ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {item.isPrepared ? 'تم التحضير' : 'لم يحضر'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Complete Order Button */}
        <div className="text-center">
          <button
            onClick={completeOrder}
            disabled={!allItemsPrepared}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              allItemsPrepared
                ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {allItemsPrepared ? (
              <>
                <svg className="w-5 h-5 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                إتمام الطلب
              </>
            ) : (
              'يرجى تحضير جميع المنتجات أولاً'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}