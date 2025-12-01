import React, { useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { notifyError } from '../utils/notifications';
import UserNavbar from '../components/UserNavbar';
import { Label } from '../components/ui/label';

export default function OrderHistoryPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSalonId, setSelectedSalonId] = useState(null);
  const [salons, setSalons] = useState([]); // All salons (for lookup)
  const [salonsWithOrders, setSalonsWithOrders] = useState([]); // Only salons that have orders - NEVER overwrite once loaded
  const salonsWithOrdersLoadedRef = useRef(false); // Use ref to track if loaded (persists across renders)
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_orders: 0,
    limit: 10,
    offset: 0,
    has_next_page: false,
    has_prev_page: false
  });
  const [pageInputValue, setPageInputValue] = useState('1');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Fetch ALL salons in batches to ensure we check all salons for orders
    const initializeData = async () => {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      try {
        // Fetch ALL salons in batches to ensure we get all of them
        let allSalons = [];
        let offset = 0;
        const limit = 1000; // Use high limit to get all salons in fewer requests
        let hasMore = true;

        while (hasMore) {
          const response = await fetch(
            `${apiUrl}/salons/browse?status=APPROVED&limit=${limit}&offset=${offset}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            // If limit/offset not supported, try without limit/offset
            if (offset === 0) {
              const fallbackResponse = await fetch(
                `${apiUrl}/salons/browse?status=APPROVED`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );
              if (!fallbackResponse.ok) {
                setLoading(false);
                return;
              }
              const fallbackData = await fallbackResponse.json();
              allSalons = fallbackData.data || [];
              hasMore = false;
            } else {
              hasMore = false;
            }
          } else {
        const data = await response.json();
            const batchSalons = data.data || [];
            allSalons = [...allSalons, ...batchSalons];
            
            // If we got fewer than the limit, we've reached the end
            if (batchSalons.length < limit) {
              hasMore = false;
            } else {
              offset += limit;
            }
          }
        }
        
        if (allSalons.length > 0) {
          // Set salons state so dropdown works properly
          setSalons(allSalons);
          // Fetch all unique salons with orders in background (non-blocking)
          // Don't wait - fetch orders immediately for faster page load
          fetchAllSalonsWithOrders(token, apiUrl).catch(() => {
            // Silently fail - don't block page
          });
          // Fetch first page of orders immediately (no salon_id = all salons)
          fetchOrdersForFilter(null, 0);
        } else {
          setLoading(false);
        }
    } catch (err) {
        // Error handled - setLoading(false) already called
        setLoading(false);
    }
  };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]); // fetchAllSalonsWithOrders and fetchOrdersForFilter are stable (useCallback)

  // Function to fetch all unique salons that have orders (for filter dropdown)
  // Memoized to prevent recreation on every render
  const fetchAllSalonsWithOrders = useCallback(async (token, apiUrl) => {
    try {
      // Fetch ALL pages to get ALL unique salons that have orders
      const salonMap = new Map();
      let offset = 0;
      const limit = 100; // Use larger limit to fetch faster
      let hasMore = true;
      
      // Fetch all pages until we've exhausted all orders
      while (hasMore) {
        const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            limit: limit,
            offset: offset
          })
        });

        if (response.ok) {
          const data = await response.json();
          const orders = data.orders || [];
          
          // Extract unique salons from this page
          orders.forEach(order => {
            if (order.salon_name && order.salon_name !== 'Unknown Salon') {
              if (!salonMap.has(order.salon_name)) {
                salonMap.set(order.salon_name, {
                  salon_id: order.salon_id || null,
                  name: order.salon_name
                });
              } else {
                // Update salon_id if we have it and it was missing before
                const existing = salonMap.get(order.salon_name);
                if (!existing.salon_id && order.salon_id) {
                  existing.salon_id = order.salon_id;
                }
              }
            }
          });
          
          // Check if there are more pages - continue until we've fetched ALL pages
          if (data.pagination && data.pagination.has_next_page) {
            offset += limit;
          } else {
            hasMore = false; // No more pages, we've fetched everything
          }
        } else {
          hasMore = false; // Stop on error
        }
      }
      
      // Set salonsWithOrders with ALL unique salons found across ALL pages
      // Only set if we haven't loaded yet (prevent overwriting)
      if (salonMap.size > 0 && !salonsWithOrdersLoadedRef.current) {
        const allSalonsList = Array.from(salonMap.values());
        setSalonsWithOrders(allSalonsList);
        salonsWithOrdersLoadedRef.current = true; // Mark as loaded using ref
        // Silently loaded all salons with orders
      }
    } catch (err) {
      // Silently fail - don't block page load
    }
  }, []); // Empty deps - function is stable

  // New function to fetch orders with backend filtering
  // Memoized to prevent recreation on every render
  const fetchOrdersForFilter = useCallback(async (salonId, offset = 0) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Build request body - if salonId is provided, include it; otherwise omit it (defaults to all)
      const requestBody = {
        limit: pagination.limit || 10,
        offset: offset
      };
      
      if (salonId !== null && salonId !== undefined) {
        requestBody.salon_id = salonId;
      }
      
      const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        
        // Backend provides salon_name in each order - use it directly
        orders.forEach(order => {
          if (!order.salon_name) {
            order.salon_name = 'Unknown Salon';
          }
        });
        
        // Only update salonsWithOrders if we haven't loaded all salons yet
        // Otherwise, we already have the complete list from fetchAllSalonsWithOrders
        // NEVER overwrite once loaded - use ref to check
        if (!salonsWithOrdersLoadedRef.current) {
          // Update salonsWithOrders for filter dropdown (accumulate unique salons from all pages)
          // Merge new salons with existing ones instead of replacing
          setSalonsWithOrders(prev => {
            const salonMap = new Map();
            
            // Add existing salons to map
            prev.forEach(salon => {
              salonMap.set(salon.name, salon);
            });
            
            // Add new salons from current page
            orders.forEach(order => {
              if (order.salon_name && order.salon_name !== 'Unknown Salon') {
                if (!salonMap.has(order.salon_name)) {
                  salonMap.set(order.salon_name, {
                    salon_id: order.salon_id || null,
                    name: order.salon_name
                  });
                } else {
                  // Update salon_id if we have it and it was missing before
                  const existing = salonMap.get(order.salon_name);
                  if (!existing.salon_id && order.salon_id) {
                    existing.salon_id = order.salon_id;
                  }
                }
              }
            });
            
            return Array.from(salonMap.values());
          });
        }
        
        setOrders(orders);
        
        // Update pagination from backend response
        if (data.pagination) {
          setPagination(data.pagination);
          setPageInputValue(data.pagination.current_page?.toString() || '1');
        } else {
          const currentPage = Math.floor(offset / (pagination.limit || 10)) + 1;
          setPagination(prev => ({
            ...prev,
            current_page: currentPage,
            total_orders: orders.length,
            offset: offset,
            has_next_page: orders.length === (pagination.limit || 10),
            has_prev_page: offset > 0
          }));
          setPageInputValue(currentPage.toString());
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        notifyError(errorData.message || 'Failed to load orders');
        setOrders([]);
      }
    } catch (err) {
      // Error already handled with notifyError
      notifyError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, salonsWithOrdersLoadedRef]); // Stable dependencies

  const fetchOrders = async (salonNameOrId, offset = 0, fetchAll = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Find salon by name first (preferred), then by ID
      let salon = salons.find(s => s.name === salonNameOrId);
      if (!salon) {
        salon = salons.find(s => s.salon_id?.toString() === salonNameOrId?.toString());
      }
      if (!salon) {
        salon = salonsWithOrders.find(s => s.name === salonNameOrId);
      }
      if (!salon) {
        salon = salonsWithOrders.find(s => s.salon_id?.toString() === salonNameOrId?.toString());
      }
      
      // Get salon_id - if salonNameOrId is a number, use it; otherwise use salon.salon_id
      let salonId = null;
      if (typeof salonNameOrId === 'string' && !isNaN(parseInt(salonNameOrId))) {
        salonId = parseInt(salonNameOrId);
      } else if (salon?.salon_id) {
        salonId = salon.salon_id;
      } else {
        // Can't fetch without salon_id
        setLoading(false);
        return;
      }
      
      // If fetchAll is true, fetch all orders in batches
      if (fetchAll) {
        let allOrders = [];
        let currentOffset = 0;
        const limit = 100; // Use a reasonable limit
        let hasMore = true;
        
        while (hasMore) {
          const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              salon_id: salonId,
              limit: limit,
              offset: currentOffset
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            const batchOrders = data.orders || [];
            allOrders = [...allOrders, ...batchOrders];
            
            // Check if there are more pages
            if (data.pagination) {
              hasMore = data.pagination.has_next_page;
              if (hasMore) {
                currentOffset += limit;
              }
            } else {
              // If no pagination info, check if we got fewer than limit
              hasMore = batchOrders.length === limit;
              if (hasMore) {
                currentOffset += limit;
              }
            }
          } else {
            hasMore = false;
          }
        }
        
        // Process all fetched orders
        allOrders.forEach(order => {
          if (!order.salon_id) {
            order.salon_id = salonId;
          }
          if (!order.salon_name) {
            order.salon_name = salon?.name || 'Unknown Salon';
          }
        });
        
        // Update salonsWithOrders for filter dropdown
        if (allOrders.length > 0) {
          const salonName = salon?.name || allOrders[0]?.salon_name || 'Unknown Salon';
          setSalonsWithOrders([{
            salon_id: salonId,
            name: salonName
          }]);
        }
        
        setOrders(allOrders);
        // Set pagination to show all orders are displayed
        setPagination({
          current_page: 1,
          total_pages: 1,
          total_orders: allOrders.length,
          limit: allOrders.length,
          offset: 0,
          has_next_page: false,
          has_prev_page: false
        });
        setPageInputValue('1');
        setLoading(false);
        return;
      }
      
      // Regular paginated fetch
      const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          salon_id: salonId,
          limit: 10,
          offset: offset
        })
      });

      if (response.ok) {
        const data = await response.json();
        const orders = data.orders || [];
        // Backend provides salon_name in each order - use it directly
        orders.forEach(order => {
          if (!order.salon_id) {
            order.salon_id = salonId;
          }
          // Use backend-provided salon_name, fallback to salon?.name, then 'Unknown Salon'
          if (!order.salon_name) {
          order.salon_name = salon?.name || 'Unknown Salon';
          }
        });
        
        // Update salonsWithOrders for filter dropdown (only salons with orders)
        if (orders.length > 0) {
          const salonName = salon?.name || orders[0]?.salon_name || 'Unknown Salon';
          setSalonsWithOrders([{
            salon_id: salonId,
            name: salonName
          }]);
        }
        
        setOrders(orders);
        const paginationData = data.pagination || {
          current_page: Math.floor(offset / 10) + 1,
          total_pages: Math.ceil((orders.length || 1) / 10),
          total_orders: orders.length,
          limit: 10,
          offset: offset,
          has_next_page: orders.length === 10,
          has_prev_page: offset > 0
        };
        setPagination(paginationData);
        setPageInputValue(paginationData.current_page?.toString() || '1');
      } else if (response.status === 500 && !selectedSalonId) {
        setOrders([]);
      } else {
        const errorData = await response.json();
        notifyError(errorData.message || 'Failed to load orders');
        setOrders([]);
      }
    } catch (err) {
      // Error already handled with notifyError
      notifyError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSalonChange = useCallback((salonName) => {
    const selected = salonName === 'all' ? null : salonName;
    setSelectedSalonId(selected);
    
    // Reset pagination to page 1 when filter changes
    setPagination(prev => ({
      ...prev,
      current_page: 1,
      offset: 0,
      has_next_page: false,
      has_prev_page: false
    }));
    setPageInputValue('1');
    
    const token = localStorage.getItem('auth_token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    if (salonName === 'all') {
      // Fetch paginated orders from all salons (no salon_id in request)
      fetchOrdersForFilter(null, 0);
    } else {
      // Find salon_id from salon_name and fetch paginated orders for that salon
      const salon = salons.find(s => s.name === salonName) || salonsWithOrders.find(s => s.name === salonName);
      if (salon?.salon_id) {
        fetchOrdersForFilter(salon.salon_id, 0);
      } else {
        // If we can't find salon_id, try to fetch all and let backend handle it
        setLoading(true);
        fetchOrdersForFilter(null, 0);
      }
    }
  }, [salons, salonsWithOrders, fetchOrdersForFilter]);

  // Use new bulk endpoint that accepts multiple salon_ids and returns paginated results
  const fetchAllOrdersOptimized = async (salonsToFetch, token, apiUrl, offset = 0) => {
    setLoading(true);
    try {
      // Extract all salon IDs
      const salonIds = salonsToFetch.map(salon => 
        typeof salon.salon_id === 'string' ? parseInt(salon.salon_id, 10) : salon.salon_id
      );
      
      // Create a map of salon_id -> salon_name for quick lookup
      const salonNameMap = new Map();
      salonsToFetch.forEach(salon => {
        const salonId = typeof salon.salon_id === 'string' ? parseInt(salon.salon_id, 10) : salon.salon_id;
        salonNameMap.set(salonId, salon.name);
      });
      
      // Use bulk endpoint - single request for all salons with pagination
          const response = await fetch(`${apiUrl}/products/customer/view-orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
          salon_ids: salonIds, // Send all salon IDs in one request
          limit: pagination.limit || 10,
          offset: offset
            })
          });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load orders');
      }

            const data = await response.json();
            const orders = data.orders || [];
      
      // Backend provides salon_name directly in each order - use it
      // Fallback to salonNameMap if salon_name is missing
      orders.forEach(order => {
        // Ensure salon_id is a number for consistency
        if (order.salon_id) {
          order.salon_id = typeof order.salon_id === 'string' ? parseInt(order.salon_id, 10) : order.salon_id;
        }
        
        if (!order.salon_name) {
          if (order.salon_id && salonNameMap.has(order.salon_id)) {
            order.salon_name = salonNameMap.get(order.salon_id);
          } else {
            order.salon_name = 'Unknown Salon';
          }
        }
      });
      
      // Build list of salons that have orders (for filter dropdown)
      // Use a Map to ensure uniqueness by salon_name (since backend provides salon_name)
      const salonMap = new Map();
      orders.forEach(order => {
        // Backend provides salon_name in each order - use it to build the filter list
        if (order.salon_name && order.salon_name !== 'Unknown Salon') {
          // Try to get salon_id from order, or look it up by salon_name
          let salonId = order.salon_id;
          if (!salonId) {
            // Look up salon_id by salon_name from salonNameMap (reverse lookup)
            for (const [id, name] of salonNameMap.entries()) {
              if (name === order.salon_name) {
                salonId = id;
                order.salon_id = id; // Set it on the order for future use
                break;
              }
            }
          }
          
          // Use salon_name as key to ensure uniqueness (backend provides this)
          if (!salonMap.has(order.salon_name)) {
            salonMap.set(order.salon_name, {
              salon_id: salonId || null,
              name: order.salon_name
            });
          }
        }
      });
      
      // Update salonsWithOrders with unique salons from orders
      const uniqueSalons = Array.from(salonMap.values());
      setSalonsWithOrders(uniqueSalons);
      
      // Also update main salons list for lookup purposes (merge, don't overwrite)
      const existingSalonIds = new Set(salons.map(s => s.salon_id));
      const newSalons = Array.from(salonMap.values())
        .filter(salon => !existingSalonIds.has(salon.salon_id));
      
      if (newSalons.length > 0) {
        setSalons(prev => [...prev, ...newSalons]);
      }
      
      setOrders(orders);
      
      // Update pagination from backend response
      if (data.pagination) {
        setPagination(data.pagination);
        setPageInputValue(data.pagination.current_page?.toString() || '1');
      } else {
        // Fallback pagination calculation
        const currentPage = Math.floor(offset / (pagination.limit || 10)) + 1;
        setPagination(prev => ({
          ...prev,
          current_page: currentPage,
          total_orders: orders.length,
          offset: offset,
          has_next_page: orders.length === (pagination.limit || 10),
          has_prev_page: offset > 0
        }));
        setPageInputValue(currentPage.toString());
      }
    } catch (err) {
      // Error already handled with notifyError
      notifyError(err.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = async (offset = 0) => {
    const token = localStorage.getItem('auth_token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    
    // Get all salons if not already loaded
    let salonsToFetch = salons.length > 0 ? salons : [];
    if (salonsToFetch.length === 0) {
      try {
        const response = await fetch(`${apiUrl}/salons/browse?status=APPROVED&limit=1000&offset=0`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          salonsToFetch = data.data || [];
        }
      } catch (err) {
        // Silently fail - salons already loaded or will be loaded
      }
    }
    
    if (salonsToFetch.length > 0) {
      await fetchAllOrdersOptimized(salonsToFetch, token, apiUrl, offset);
    } else {
      setLoading(false);
    }
  };

  const handlePageChange = useCallback((newOffset) => {
    // Find salon_id if a salon is selected
    let salonId = null;
    if (selectedSalonId) {
      const salon = salons.find(s => s.name === selectedSalonId) || salonsWithOrders.find(s => s.name === selectedSalonId);
      salonId = salon?.salon_id || null;
    }
    
    // Use the new backend filtering function
    fetchOrdersForFilter(salonId, newOffset);
  }, [selectedSalonId, salons, salonsWithOrders, fetchOrdersForFilter]);

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    if (value === '' || (Number(value) >= 1 && Number(value) <= pagination.total_pages)) {
      setPageInputValue(value);
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInputValue, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > pagination.total_pages) {
      setPageInputValue(pagination.current_page?.toString() || '1');
    }
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.total_pages) {
      const newOffset = (pageNum - 1) * pagination.limit;
      handlePageChange(newOffset);
    } else {
      setPageInputValue(pagination.current_page?.toString() || '1');
    }
  };

  // Update page input when pagination changes
  useEffect(() => {
    setPageInputValue(pagination.current_page?.toString() || '1');
  }, [pagination.current_page]);

  // Update salonsWithOrders whenever orders change - extract unique salon names
  useEffect(() => {
    if (orders.length === 0) {
      setSalonsWithOrders([]);
      return;
    }
    
    // Extract unique salon names from orders (backend provides salon_name in each order)
    const salonNameSet = new Set();
    const salonMap = new Map();
    
    orders.forEach(order => {
      if (order.salon_name && order.salon_name !== 'Unknown Salon') {
        if (!salonNameSet.has(order.salon_name)) {
          salonNameSet.add(order.salon_name);
          salonMap.set(order.salon_name, {
            salon_id: order.salon_id || null,
            name: order.salon_name
          });
        }
      }
    });
    
    setSalonsWithOrders(Array.from(salonMap.values()));
  }, [orders]);
  
  // Filter orders by selected salon name (client-side filtering)
  const filteredOrders = useMemo(() => {
    if (!selectedSalonId || selectedSalonId === 'all') {
      return orders;
    }
    return orders.filter(order => order.salon_name === selectedSalonId);
  }, [orders, selectedSalonId]);

  // Memoize expensive order processing operations (must be before any conditional returns)
  const sortedOrders = useMemo(() => {
    if (filteredOrders.length === 0) return [];

  // Group orders by order_code (each order has a unique order_code)
  const groupedOrders = {};
  filteredOrders.forEach(order => {
    const orderCode = order.order_code || 'unknown';
    const salonId = order.salon_id || 'unknown';
    const salonName = order.salon_name || 'Unknown Salon';
    
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
        salon_id: salonId,
        salon_name: salonName,
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
    return Object.values(groupedOrders).sort((a, b) => {
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
  }, [filteredOrders]);

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
                  {selectedSalonId ? selectedSalonId : 'All Salons'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Salons</SelectItem>
                {salonsWithOrders.map((salon) => (
                  <SelectItem key={salon.name} value={salon.name}>
                    {salon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-24 text-center flex flex-col items-center justify-center min-h-[400px]">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">You haven't placed any orders yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedOrders.map((order) => (
              <OrderCard key={order.order_code} order={order} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {pagination.total_pages > 1 ? (
                `Showing ${pagination.offset + 1} - ${Math.min(pagination.offset + pagination.limit, pagination.total_orders || sortedOrders.length)} of ${pagination.total_orders || sortedOrders.length} orders`
              ) : (
                `Showing ${sortedOrders.length} order${sortedOrders.length !== 1 ? 's' : ''}`
              )}
            </div>
            
            {pagination.total_pages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.offset - pagination.limit)}
                  disabled={!pagination.has_prev_page}
                  className="h-9 px-3"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                {/* Page Number Input */}
                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Page</span>
                  <Input
                    type="number"
                    min={1}
                    max={pagination.total_pages}
                    value={pageInputValue}
                    onChange={handlePageInputChange}
                    onBlur={handlePageInputBlur}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePageInputSubmit(e);
                      }
                    }}
                    className="w-16 h-9 text-center text-sm font-medium border-gray-300 focus:border-primary focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    style={{ WebkitAppearance: 'textfield' }}
                    disabled={loading}
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">of {pagination.total_pages}</span>
                </form>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.offset + pagination.limit)}
                  disabled={!pagination.has_next_page}
                  className="h-9 px-3"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Memoized Order Card Component for better performance
const OrderCard = memo(({ order }) => {
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="shadow-sm">
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
              {formatDate(order.order_date)}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item, itemIdx) => (
            <div key={`${item.product_id}_${item.purchase_price}_${itemIdx}`}>
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
  );
});

OrderCard.displayName = 'OrderCard';