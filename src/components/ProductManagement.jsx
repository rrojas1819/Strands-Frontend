import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit2, Trash2, Package, X } from 'lucide-react';
import StrandsModal from './ui/strands-modal';

export default function ProductManagement({ salonId, onSuccess, onError }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    category: '',
    stock_qty: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (salonId) {
      fetchProducts();
    }
  }, [salonId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/${salonId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else if (response.status === 404) {
        setProducts([]);
      } else {
        const errorData = await response.json();
        if (onError) onError(errorData.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      if (onError) onError('Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      const priceValue = Number(parseFloat(formData.price).toFixed(2));
      const stockQtyValue = Number(parseInt(formData.stock_qty));
      
      if (isNaN(priceValue) || isNaN(stockQtyValue)) {
        if (onError) onError('Invalid number values. Please check price and stock quantity.');
        setSubmitting(false);
        return;
      }
      
      const requestBody = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sku: formData.sku.trim(),
        price: priceValue,
        category: formData.category,
        stock_qty: stockQtyValue
      };

      // console.log('Sending product data:', requestBody);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        const textResponse = await response.text();
        console.error('Response text:', textResponse);
        if (onError) {
          onError(`Server error: ${response.status} ${response.statusText}. ${textResponse || 'No error details available'}`);
        }
        return;
      }

      // console.log('Backend response:', data);

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        fetchProducts();
        if (onSuccess) onSuccess('Product added successfully!');
      } else {
        if (onError) {
          if (response.status === 409) {
            onError('SKU already exists. Please use a different SKU.');
          } else {
            onError(data.message || `Failed to add product (${response.status}): ${JSON.stringify(data)}`);
          }
        }
      }
    } catch (error) {
      console.error('Error adding product:', error);
      if (onError) {
        onError(`Network error: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      const priceValue = Number(parseFloat(formData.price).toFixed(2));
      const stockQtyValue = Number(parseInt(formData.stock_qty));
      
      if (isNaN(priceValue) || isNaN(stockQtyValue)) {
        if (onError) onError('Invalid number values. Please check price and stock quantity.');
        setSubmitting(false);
        return;
      }
      
      const requestBody = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sku: formData.sku.trim(),
        price: priceValue,
        category: formData.category,
        stock_qty: stockQtyValue
      };

      // console.log('Updating product with data:', requestBody);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/${selectedProduct.product_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        const textResponse = await response.text();
        console.error('Response text:', textResponse);
        if (onError) {
          onError(`Server error: ${response.status} ${response.statusText}. ${textResponse || 'No error details available'}`);
        }
        return;
      }

      // console.log('Backend response:', data);

      if (response.ok) {
        setShowEditModal(false);
        setSelectedProduct(null);
        resetForm();
        fetchProducts();
        if (onSuccess) onSuccess('Product updated successfully!');
      } else {
        if (onError) {
          if (response.status === 409) {
            onError('SKU already exists. Please use a different SKU.');
          } else {
            onError(data.message || `Failed to update product (${response.status}): ${JSON.stringify(data)}`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      if (onError) {
        onError(`Network error: ${error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/${selectedProduct.product_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setShowDeleteModal(false);
        setSelectedProduct(null);
        fetchProducts();
        if (onSuccess) onSuccess('Product deleted successfully!');
      } else {
        if (onError) onError(data.message || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      if (onError) onError('Failed to delete product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.description || !formData.sku || !formData.price || !formData.category || !formData.stock_qty) {
      if (onError) onError('All fields are required');
      return false;
    }
    if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      if (onError) onError('Price must be a positive number');
      return false;
    }
    if (isNaN(formData.stock_qty) || parseInt(formData.stock_qty) < 0) {
      if (onError) onError('Stock quantity must be a non-negative number');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      price: '',
      category: '',
      stock_qty: ''
    });
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      sku: product.sku,
      price: product.price.toString(),
      category: product.category,
      stock_qty: product.stock_qty.toString()
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const categories = [
    'SHAMPOO',
    'CONDITIONER',
    'HAIR TREATMENT',
    'STYLING PRODUCT',
    'HAIR COLOR',
    'HAIR ACCESSORIES',
    'SKINCARE',
    'OTHER'
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Product Management</h3>
          <p className="text-muted-foreground">
            Manage your salon products ({products.length} total)
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg mb-2">No products yet</p>
            <p className="text-muted-foreground text-sm mb-4">Start selling by adding your first product</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.product_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">{product.category}</Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(product)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(product)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="font-medium">{product.sku}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-semibold text-green-800">${parseFloat(product.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock:</span>
                    <Badge variant="outline" className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${product.stock_qty > 0 ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'}`}>
                      {product.stock_qty} in stock
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Product</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Professional Shampoo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Product description"
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU (Stock Keeping Unit) *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  placeholder="e.g., SHAMPOO-001"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Unique product code for inventory tracking</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="1.00"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock_qty">Stock Quantity *</Label>
                  <Input
                    id="stock_qty"
                    type="number"
                    min="0"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({...formData, stock_qty: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">
                      {formData.category || null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Product</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowEditModal(false);
                setSelectedProduct(null);
                resetForm();
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Professional Shampoo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Product description"
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-sku">SKU (Stock Keeping Unit) *</Label>
                <Input
                  id="edit-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  placeholder="e.g., SHAMPOO-001"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Unique product code for inventory tracking</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Price ($) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="1.00"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-stock_qty">Stock Quantity *</Label>
                  <Input
                    id="edit-stock_qty"
                    type="number"
                    min="0"
                    value={formData.stock_qty}
                    onChange={(e) => setFormData({...formData, stock_qty: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">
                      {formData.category || null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowEditModal(false);
                  setSelectedProduct(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Product'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StrandsModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProduct(null);
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        type="warning"
        onConfirm={handleDeleteProduct}
        confirmText={submitting ? 'Deleting...' : 'Delete Product'}
        showCancel={true}
        cancelText="Cancel"
      />
    </div>
  );
}
