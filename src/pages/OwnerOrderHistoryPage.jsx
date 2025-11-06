import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Package, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { notifyError } from '../utils/notifications';
import strandsLogo from '../assets/32ae54e35576ad7a97d684436e3d903c725b33cd.png';

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
    
    // Extract order date (prioritize ordered_date)
    const orderDate = order.ordered_date || order.order_date || order.orderDate || order.created_at || order.createdAt || 
                     order.date || order.order_created_at || order.created || order.timestamp || 
                     order.purchase_date || order.purchased_at || null;
    
    // Use order_code as unique key (each order_code is unique)
    if (!groupedOrders[orderCode]) {
      groupedOrders[orderCode] = {
        order_code: orderCode,
        customer_name: customerName,
        subtotal: parseFloat(order.subtotal_order_price || 0),
        tax: parseFloat(order.order_tax || 0),
        total: parseFloat(order.total_order_price || 0),
        order_date: orderDate,
        items: []
      };
    }
    
    // Add each item (backend may return quantity field, or one row per item)
    // If quantity exists, use it; otherwise assume 1 per row (we'll consolidate later)
    const itemQuantity = order.quantity || order.item_quantity || 1;
    groupedOrders[orderCode].items.push({
      product_id: order.product_id,
      name: order.name || 'Product',
      description: order.description || '',
      category: order.category || 'Product',
      purchase_price: parseFloat(order.purchase_price || 0),
      quantity: itemQuantity
    });
  });
  
  // Consolidate duplicate items in the same order
  // Backend returns one row per order_item, so we count rows to get quantity
  Object.keys(groupedOrders).forEach(orderCode => {
    const order = groupedOrders[orderCode];
    const itemMap = {};
    
    order.items.forEach(item => {
      // Use product_id and purchase_price as key to group identical items
      const key = `${item.product_id}_${item.purchase_price}`;
      if (itemMap[key]) {
        // Sum quantities: each row represents quantity 1
        itemMap[key].quantity = (itemMap[key].quantity || 0) + (item.quantity || 1);
      } else {
        // First occurrence of this product/price combination
        itemMap[key] = { ...item, quantity: item.quantity || 1 };
      }
    });
    
    const consolidatedItems = Object.values(itemMap);
    
    // Debug: log if consolidation changed anything
    if (order.items.length !== consolidatedItems.length) {
      console.log(`Owner Order ${orderCode}: Consolidated ${order.items.length} rows into ${consolidatedItems.length} items`);
      consolidatedItems.forEach(item => {
        const totalPrice = (item.purchase_price || 0) * (item.quantity || 1);
        console.log(`  - ${item.name}: Qty ${item.quantity} × $${item.purchase_price.toFixed(2)} = $${totalPrice.toFixed(2)}`);
      });
    }
    
    order.items = consolidatedItems;
  });
  
  // Sort orders by date (most recent first), fallback to order_code if no date
  const sortedOrders = Object.values(groupedOrders).sort((a, b) => {
    // If both have dates, sort by date (most recent first)
    if (a.order_date && b.order_date) {
      const dateA = new Date(a.order_date);
      const dateB = new Date(b.order_date);
      return dateB - dateA; // Most recent first
    }
    // If only one has a date, prioritize it
    if (a.order_date && !b.order_date) return -1;
    if (!a.order_date && b.order_date) return 1;
    // If neither has a date, sort by order_code
    return b.order_code.localeCompare(a.order_code);
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img 
                src={strandsLogo} 
                alt="Strands" 
                className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/dashboard')}
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Salon Owner Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your salon business</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Owner
              </Badge>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-muted/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button 
              onClick={() => navigate('/dashboard')}
              className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
            >
              Overview
            </button>
            {salonStatus === 'APPROVED' && (
              <>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Staff
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Products
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Customers
                </button>
                <button 
                  onClick={() => navigate('/owner/order-history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    location.pathname === '/owner/order-history'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  Order History
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Reviews
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Loyalty
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Promotions
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="py-4 px-1 border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground font-medium text-sm"
                >
                  Settings
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

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
                      <div key={itemIdx} className="flex justify-between items-start py-3">
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
                    ))}
                    <div className="pt-4 space-y-2 mt-4">
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

