import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import OwnerNavbar from '../components/OwnerNavbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { notifyError } from '../utils/notifications';

export default function OwnerOrderHistoryPage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salonStatus, setSalonStatus] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    limit: 10,
    offset: 0,
    has_next_page: false,
    has_prev_page: false
  });

  useEffect(() => {
    if (!user || user.role !== 'OWNER') {
      navigate('/dashboard');
      return;
    }

    checkSalonStatus();
    fetchOrders(0);
  }, [user, navigate]);

  const checkSalonStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setSalonStatus(null);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/salons/check`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSalonStatus(data.status || null);
      }
    } catch (err) {
      console.error('Error checking salon status:', err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const fetchOrders = async (offset = 0) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/owner/view-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          limit: 10,
          offset: offset
        })
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        // Debug: log first order to see available fields
        if (orders.length > 0) {
          console.log('Owner - Sample order fields:', Object.keys(orders[0]));
          console.log('Owner - Sample order data:', orders[0]);
          console.log('Owner - ordered_date value:', orders[0].ordered_date);
        }
        setOrders(orders);
        setPagination(data.pagination || pagination);
      } else if (response.status === 500) {
        setOrders([]);
      } else {
        const errorData = await response.json();
        notifyError(errorData.message || 'Failed to load orders');
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      notifyError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newOffset) => {
    fetchOrders(newOffset);
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Group orders by order_code (each order has a unique order_code)
  const groupedOrders = {};
  orders.forEach(order => {
    const orderCode = order.order_code || 'unknown';
    const customerName = order.customer_name || 'Unknown';
    
    // Extract order date/time from various possible field names (prioritize created_at for time sorting)
    const orderDateTime = order.created_at || order.createdAt || order.ordered_date || order.order_date || 
                         order.orderDate || order.order_created_at || order.created || order.timestamp || 
                         order.purchase_date || order.purchased_at || null;
    
    // Extract just the date part for display (without time)
    const orderDate = orderDateTime ? orderDateTime.split('T')[0] : null;
    
    // Use order_code as unique key (each order_code is unique)
    if (!groupedOrders[orderCode]) {
      groupedOrders[orderCode] = {
        order_code: orderCode,
        customer_name: customerName,
        subtotal: parseFloat(order.subtotal_order_price || 0),
        tax: parseFloat(order.order_tax || 0),
        total: parseFloat(order.total_order_price || 0),
        order_date: orderDate, // Date only for display
        order_datetime: orderDateTime, // Full datetime for sorting
        items: []
      };
    }
    
    // Add each item - backend now returns quantity field
    const itemQuantity = order.quantity || 1;
    groupedOrders[orderCode].items.push({
      product_id: order.product_id,
      name: order.name || 'Product',
      description: order.description || '',
      category: order.category || 'Product',
      purchase_price: parseFloat(order.purchase_price || 0),
      quantity: itemQuantity
    });
  });
  
  // Consolidate duplicate items in the same order (same product_id and purchase_price)
  Object.keys(groupedOrders).forEach(orderCode => {
    const order = groupedOrders[orderCode];
    const itemMap = {};
    
    order.items.forEach(item => {
      const key = `${item.product_id}_${item.purchase_price}`;
      if (itemMap[key]) {
        // Sum quantities for same product and price
        itemMap[key].quantity = (itemMap[key].quantity || 0) + (item.quantity || 0);
      } else {
        // First occurrence
        itemMap[key] = { ...item, quantity: item.quantity || 0 };
      }
    });
    
    order.items = Object.values(itemMap);
  });
  
  // Sort orders by time (most recent first) - use order_datetime for accurate time sorting
  const sortedOrders = Object.values(groupedOrders).sort((a, b) => {
    if (a.order_datetime && b.order_datetime) {
      const timeA = new Date(a.order_datetime).getTime();
      const timeB = new Date(b.order_datetime).getTime();
      return timeB - timeA; // Most recent first
    }
    if (a.order_datetime && !b.order_datetime) return -1;
    if (!a.order_datetime && b.order_datetime) return 1;
    // Fallback to order_code
    return b.order_code.localeCompare(a.order_code);
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <OwnerNavbar 
        salonStatus={salonStatus}
        handleLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Order History</h1>
          <p className="text-muted-foreground">View all orders from customers</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">No customers have placed orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedOrders.map((order, idx) => (
              <Card key={idx} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">Order #{order.order_code}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Customer: {order.customer_name}
                      </p>
                    </div>
                    {order.order_date && (
                      <p className="text-xs text-muted-foreground ml-4 whitespace-nowrap">
                        {(() => {
                          try {
                            const date = new Date(order.order_date);
                            if (isNaN(date.getTime())) {
                              // If date parsing fails, try to format the string directly
                              return order.order_date;
                            }
                            return date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            });
                          } catch (e) {
                            return order.order_date;
                          }
                        })()}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item, itemIdx) => (
                      <div key={itemIdx}>
                        <div className="flex justify-between items-start py-3">
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-sm text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{item.category || 'Product'}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right min-w-[120px]">
                            <p className="text-sm font-medium text-foreground">${(item.purchase_price || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Qty: {item.quantity || 1}</p>
                            <p className="text-xs font-medium text-foreground mt-1">
                              ${((item.purchase_price || 0) * (item.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {itemIdx < order.items.length - 1 && (
                          <div className="border-b border-gray-200"></div>
                        )}
                      </div>
                    ))}
                    <div className="border-b border-gray-200 mt-4"></div>
                    <div className="pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (6.625%)</span>
                        <span className="font-medium text-foreground">${order.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2">
                        <span className="text-foreground">Total</span>
                        <span className="text-foreground">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pagination.total_pages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.offset - pagination.limit)}
              disabled={!pagination.has_prev_page}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.offset + pagination.limit)}
              disabled={!pagination.has_next_page}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

