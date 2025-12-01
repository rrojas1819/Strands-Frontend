import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ShoppingCart, Plus, Minus, ArrowLeft } from 'lucide-react';
import { notifySuccess, notifyError } from '../utils/notifications';
import UserNavbar from '../components/UserNavbar';

export default function ProductsPage() {
  const { salonId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [cartItemCount, setCartItemCount] = useState(0);
  const [salonName, setSalonName] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchSalonName();
    fetchProducts();
    fetchCartCount();
  }, [user, salonId, navigate]);

  // Memoize salon name fetch to prevent unnecessary calls
  const fetchSalonName = useCallback(async () => {
    if (salonName) return; // Already have salon name
    
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/salons/browse?status=APPROVED&salon_id=${salonId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const salon = data.data?.[0]; // Expecting an array with one salon
        if (salon) {
          setSalonName(salon.name);
        }
      }
    } catch (err) {
      console.error('Error fetching salon name:', err);
    }
  }, [salonId, salonName]);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/${salonId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        const initialQuantities = {};
        (data.products || []).forEach(product => {
          initialQuantities[product.product_id] = 1;
        });
        setQuantities(initialQuantities);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load products');
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/customer/view-cart/${salonId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const totalItems = (data.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartItemCount(totalItems);
      }
    } catch (err) {
      console.error('Error fetching cart count:', err);
    }
  };

  const handleAddToCart = async (productId, quantity) => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/customer/add-to-cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          salon_id: parseInt(salonId),
          product_id: productId,
          quantity: parseInt(quantity)
        })
      });

      const data = await response.json();

      if (response.ok) {
        notifySuccess('Product added to cart');
        fetchCartCount();
        setQuantities(prev => ({ ...prev, [productId]: 1 }));
      } else {
        notifyError(data.message || 'Failed to add product to cart');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      notifyError('Failed to add product to cart');
    }
  };

  const handleQuantityChange = (productId, delta) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const newQuantity = Math.max(1, Math.min(current + delta, 999));
      return { ...prev, [productId]: newQuantity };
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <UserNavbar activeTab="dashboard" title="Products" subtitle="Browse salon products" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          {salonName && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Products from</p>
              <h2 className="text-2xl font-bold text-foreground">{salonName}</h2>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Products</h2>
            <p className="text-muted-foreground">Browse and add products to your cart</p>
          </div>
          <Button
            id="view-cart-button"
            onClick={() => navigate(`/cart/${salonId}`)}
            className="flex items-center space-x-2"
            disabled={cartItemCount === 0}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>View Cart</span>
            {cartItemCount > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products available</h3>
              <p className="text-muted-foreground">This salon doesn't have any products yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.product_id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <Badge variant="secondary" className="w-fit mt-2">
                    {product.category}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow">
                  <p className="text-sm text-muted-foreground mb-4 flex-grow">{product.description}</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-green-800">
                        ${typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Stock: {product.stock_qty || 0}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border rounded-lg">
                        <Button
                          id={`quantity-minus-button-${product.product_id}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(product.product_id, -1)}
                          disabled={quantities[product.product_id] <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={product.stock_qty || 999}
                          value={quantities[product.product_id] || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const max = product.stock_qty || 999;
                            setQuantities(prev => ({
                              ...prev,
                              [product.product_id]: Math.max(1, Math.min(val, max))
                            }));
                          }}
                          className="w-16 text-center border-0 h-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        />
                        <Button
                          id={`quantity-plus-button-${product.product_id}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleQuantityChange(product.product_id, 1)}
                          disabled={quantities[product.product_id] >= (product.stock_qty || 999)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Button
                        id={`add-to-cart-button-${product.product_id}`}
                        onClick={() => handleAddToCart(product.product_id, quantities[product.product_id] || 1)}
                        className="flex-1"
                        disabled={!product.stock_qty || product.stock_qty === 0}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

