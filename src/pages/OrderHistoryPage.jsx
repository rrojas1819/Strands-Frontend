import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { notifyError } from '../utils/notifications';
import UserNavbar from '../components/UserNavbar';
import { Label } from '../components/ui/label';

export default function OrderHistoryPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalonId, setSelectedSalonId] = useState(null);
  const [salons, setSalons] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    limit: 10,
    offset: 0,
    has_next_page: false,
    has_prev_page: false
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchSalons().then(() => {
      // After salons are loaded, fetch all orders by default
      fetchAllOrders(0);
    });
  }, [user, navigate]);

  const fetchSalons = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSalons(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching salons:', err);
    }
  };

  const fetchOrders = async (salonId, offset = 0) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Get salon name
      const salon = salons.find(s => s.salon_id == salonId);
      
      const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: parseInt(salonId),
          limit: 10,
          offset: offset
        })
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        // Debug: log first order to see available fields
        if (orders.length > 0) {
          console.log('Full API response:', data);
          console.log('Sample order fields:', Object.keys(orders[0]));
          console.log('Sample order data (full):', JSON.stringify(orders[0], null, 2));
          console.log('ordered_date value:', orders[0].ordered_date);
          console.log('All orders count:', orders.length);
        }
        // Add salon info to each order item
        orders.forEach(order => {
          order.salon_id = parseInt(salonId);
          order.salon_name = salon?.name || 'Unknown Salon';
        });
        setOrders(orders);
        setPagination(data.pagination || pagination);
      } else if (response.status === 500 && !selectedSalonId) {
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

  const handleSalonChange = (salonId) => {
    setSelectedSalonId(salonId === 'all' ? null : salonId);
    if (salonId === 'all') {
      fetchAllOrders(0);
    } else {
      fetchOrders(salonId, 0);
    }
  };

  const fetchAllOrders = async (offset = 0) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const allOrders = [];
      const salonsToFetch = salons.length > 0 ? salons : await fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(res => res.json()).then(data => data.data || []).catch(() => []);
      
      for (const salon of salonsToFetch) {
        try {
          const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              salon_id: parseInt(salon.salon_id),
              limit: 100,
              offset: 0
            })
          });

          if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];
            // Debug: log first order to see available fields (only once)
            if (allOrders.length === 0 && orders.length > 0) {
              console.log('Full API response from fetchAllOrders:', data);
              console.log('Sample order fields from fetchAllOrders:', Object.keys(orders[0]));
              console.log('Sample order data from fetchAllOrders (full):', JSON.stringify(orders[0], null, 2));
              console.log('ordered_date value from fetchAllOrders:', orders[0].ordered_date);
            }
            // Add salon info to each order item
            orders.forEach(order => {
              order.salon_id = salon.salon_id;
              order.salon_name = salon.name;
            });
            allOrders.push(...orders);
          } else if (response.status === 500) {
            // No orders for this salon, continue
            continue;
          }
        } catch (err) {
          console.error(`Error fetching orders for salon ${salon.salon_id}:`, err);
        }
      }
      
      setOrders(allOrders);
      setPagination(prev => ({ ...prev, total_pages: 1, current_page: 1 }));
    } catch (err) {
      console.error('Error fetching all orders:', err);
      notifyError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newOffset) => {
    if (selectedSalonId) {
      fetchOrders(selectedSalonId, newOffset);
    } else {
      fetchAllOrders(newOffset);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30">
        <UserNavbar activeTab="orders" title="Order History" subtitle="View your past orders" />
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
    const salonId = order.salon_id || 'unknown';
    const salonName = order.salon_name || 'Unknown Salon';
    
    // Extract order date from various possible field names (prioritize ordered_date)
    const orderDate = order.ordered_date || order.order_date || order.orderDate || order.created_at || order.createdAt || 
                     order.date || order.order_created_at || order.created || order.timestamp || 
                     order.purchase_date || order.purchased_at || null;
    
    // Use order_code as unique key (each order_code is unique)
    if (!groupedOrders[orderCode]) {
      groupedOrders[orderCode] = {
        order_code: orderCode,
        salon_id: salonId,
        salon_name: salonName,
        subtotal: parseFloat(order.subtotal_order_price || 0),
        tax: parseFloat(order.order_tax || 0),
        total: parseFloat(order.total_order_price || 0),
        order_date: orderDate,
        items: []
      };
      
      // Debug: log if date was found
      if (orderDate) {
        console.log(`Order ${orderCode} date found:`, orderDate, 'Type:', typeof orderDate);
      } else {
        console.warn(`Order ${orderCode} - no date found. Available fields:`, Object.keys(order));
        console.warn(`Order ${orderCode} - ordered_date specifically:`, order.ordered_date);
      }
    }
    
    // Add each item (backend returns one row per order item, but doesn't include quantity field)
    // Each row represents quantity 1, so we'll count rows to get quantity
    groupedOrders[orderCode].items.push({
      product_id: order.product_id,
      name: order.name || 'Product',
      description: order.description || '',
      category: order.category || 'Product',
      purchase_price: parseFloat(order.purchase_price || 0),
      quantity: 1 // Each row = quantity 1 (we'll sum these in consolidation)
    });
  });
  
  // Consolidate duplicate items in the same order
  Object.keys(groupedOrders).forEach(orderCode => {
    const order = groupedOrders[orderCode];
    const itemMap = {};
    
    order.items.forEach(item => {
      const key = `${item.product_id}_${item.purchase_price}`;
      if (itemMap[key]) {
        // Add quantities together for same product and price
        // Each row from backend represents quantity 1, so we sum them
        const currentQty = itemMap[key].quantity || 0;
        const itemQty = item.quantity || 1;
        itemMap[key].quantity = currentQty + itemQty;
      } else {
        // First occurrence - ensure quantity is set (default to 1 if somehow missing)
        itemMap[key] = { ...item, quantity: item.quantity || 1 };
      }
    });
    
    const consolidatedItems = Object.values(itemMap);
    
    // Debug: log consolidation for all orders
    if (order.items.length !== consolidatedItems.length) {
      console.log(`Order ${orderCode}: Consolidated ${order.items.length} rows into ${consolidatedItems.length} unique items`);
      consolidatedItems.forEach(item => {
        const totalPrice = (item.purchase_price || 0) * (item.quantity || 1);
        console.log(`  - ${item.name}: Qty ${item.quantity} × $${item.purchase_price.toFixed(2)} = $${totalPrice.toFixed(2)}`);
      });
    } else {
      // Log even if no consolidation happened to verify quantities
      console.log(`Order ${orderCode}: ${consolidatedItems.length} items (no consolidation needed)`);
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
      <UserNavbar activeTab="orders" title="Order History" subtitle="View your past orders" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Your Orders</h2>
            <p className="text-sm text-muted-foreground">View and manage your past purchases</p>
          </div>
          <div className="w-full sm:w-64">
            <Label className="text-sm font-medium mb-2 block">Filter by Salon</Label>
            <Select value={selectedSalonId || 'all'} onValueChange={handleSalonChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Salons">
                  {selectedSalonId ? salons.find(s => s.salon_id.toString() === selectedSalonId.toString())?.name || 'All Salons' : 'All Salons'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salons</SelectItem>
                {salons.map((salon) => (
                  <SelectItem key={salon.salon_id} value={salon.salon_id.toString()}>
                    {salon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">You haven't placed any orders yet.</p>
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
                        <Badge variant="outline" className="text-xs">
                          {order.salon_name}
                        </Badge>
                      </div>
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