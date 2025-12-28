import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';
import { notifySuccess, notifyError } from '../utils/notifications';
import UserNavbar from '../components/UserNavbar';
import StrandsModal from '../components/StrandsModal';

export default function CartPage() {
  const { salonId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [salonName, setSalonName] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'CUSTOMER') {
      navigate('/login');
      return;
    }

    fetchSalonName();
    fetchCart();
  }, [user, salonId, navigate]);

  const fetchSalonName = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/salons/browse?status=APPROVED`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const salons = data.data || [];
        const salon = salons.find(s => s.salon_id == salonId);
        if (salon) {
          setSalonName(salon.name);
        }
      }
    } catch (err) {
      console.error('Error fetching salon name:', err);
    }
  };

  const fetchCart = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/customer/view-cart/${salonId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        setCartItems(items);
        const total = items.reduce((sum, item) => {
          return sum + (parseFloat(item.price || 0) * (item.quantity || 0));
        }, 0);
        setSubtotal(total);
      } else if (response.status === 404) {
        setCartItems([]);
        setSubtotal(0);
      } else {
        const errorData = await response.json();
        notifyError(errorData.message || 'Failed to load cart');
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      notifyError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      handleDeleteClick(productId);
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/customer/update-cart`, {
        method: 'PATCH',
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
        notifySuccess('Cart updated');
        fetchCart();
      } else {
        notifyError(data.message || 'Failed to update cart');
      }
    } catch (err) {
      console.error('Error updating cart:', err);
      notifyError('Failed to update cart');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (productId) => {
    const item = cartItems.find(i => i.product_id === productId);
    setItemToDelete({ product_id: productId, name: item?.name || 'Product' });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiUrl}/products/customer/remove-from-cart`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          salon_id: parseInt(salonId),
          product_id: itemToDelete.product_id
        })
      });

      const data = await response.json();

      if (response.ok) {
        notifySuccess('Item removed from cart');
        fetchCart();
        setShowDeleteModal(false);
        setItemToDelete(null);
      } else {
        notifyError(data.message || 'Failed to remove item');
      }
    } catch (err) {
      console.error('Error removing from cart:', err);
      notifyError('Failed to remove item');
    } finally {
      setUpdating(false);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      notifyError('Your cart is empty');
      return;
    }
    navigate(`/products/checkout/${salonId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <UserNavbar activeTab="dashboard" title="Shopping Cart" subtitle="Review your items" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <UserNavbar activeTab="dashboard" title="Shopping Cart" subtitle="Review your items" />

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
            <div className="mb-2">
              <p className="text-sm text-muted-foreground">Shopping from</p>
              <h2 className="text-2xl font-bold text-foreground">{salonName}</h2>
            </div>
          )}
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="pt-16 pb-12 text-center">
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">Add products to get started</p>
              <Button onClick={() => navigate(`/products/${salonId}`)}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.product_id}>
                  <CardContent className="p-6 pt-8">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-semibold text-green-800">
                            ${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                          </span>
                          <Badge variant="secondary">{item.category}</Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleUpdateQuantity(item.product_id, (item.quantity || 1) - 1)}
                            disabled={updating}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max={item.stock_qty || 999}
                            value={item.quantity || 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              handleUpdateQuantity(item.product_id, val);
                            }}
                            className="w-16 text-center border-0 h-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            disabled={updating}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleUpdateQuantity(item.product_id, (item.quantity || 1) + 1)}
                            disabled={updating || (item.quantity || 1) >= (item.stock_qty || 999)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(item.product_id)}
                          disabled={updating}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Subtotal: <span className="font-semibold text-foreground">
                          ${(parseFloat(item.price || 0) * (item.quantity || 0)).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-xl font-bold text-green-800">${subtotal.toFixed(2)}</span>
                    </div>
                    
                    <Button
                      onClick={handleCheckout}
                      className="w-full"
                      size="lg"
                    >
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => navigate(-1)}
                      className="w-full mt-2"
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <StrandsModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Remove Item"
        message={`Are you sure you want to remove "${itemToDelete?.name}" from your cart?`}
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
}

