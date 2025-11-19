import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Calendar, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

export default function HaircutGalleryModal({ isOpen, onClose, salonId, salonName }) {
  const [employees, setEmployees] = useState([]); // List of employees with employee_id and name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null); // employee_id of selected employee
  const [galleryData, setGalleryData] = useState({ before: [], after: [], pagination: null });
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const haircutsPerPage = 5;

  // Fetch employees when modal opens
  useEffect(() => {
    if (isOpen && salonId) {
      fetchEmployees();
      setCurrentPage(1);
      setSelectedEmployeeId(null);
      setGalleryData({ before: [], after: [], pagination: null });
    }
  }, [isOpen, salonId]);

  // Auto-select first employee when employees are available
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].employee_id);
    }
  }, [employees, selectedEmployeeId]);

  // Fetch gallery when employee is selected
  useEffect(() => {
    if (selectedEmployeeId && salonId) {
      setCurrentPage(1);
      fetchGallery(selectedEmployeeId, 1); // selectedEmployeeId is now employee_id
    }
  }, [selectedEmployeeId, salonId]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Try customer-accessible endpoint first
      const response = await fetch(`${apiUrl}/salons/${salonId}/stylists`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch employees');
      }

      const data = await response.json();
      
      if (data.data) {
        let employeeList = [];
        
        // Handle customer endpoint response: { data: { salon: {...}, stylists: [...] } }
        if (data.data.stylists && Array.isArray(data.data.stylists)) {
          // Customer endpoint returns: employee_id, title, active, full_name, email, phone, profile_picture_url
          // Gallery endpoint now accepts employee_id directly (backend was updated)
          employeeList = data.data.stylists
            .filter(emp => emp.active !== false)
            .map(emp => ({
              employee_id: emp.employee_id,
              name: emp.full_name || 'Unknown'
            }));
        }
        // Handle owner endpoint response: { data: [...] }
        else if (Array.isArray(data.data)) {
          // Owner endpoint returns: employee_id, user_id, title, active, full_name, email, phone, profile_picture_url
          employeeList = data.data
            .filter(emp => emp.active !== false)
            .map(emp => ({
              employee_id: emp.employee_id,
              name: emp.full_name || 'Unknown'
            }));
        }
        
        setEmployees(employeeList);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.message || 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGallery = async (employeeId, page = 1) => {
    setGalleryLoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setGalleryLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const limit = haircutsPerPage;
      const offset = (page - 1) * limit;
      
      // Backend now accepts employee_id (not user_id)
      const response = await fetch(
        `${apiUrl}/file/get-salon-gallery?salon_id=${salonId}&employee_id=${employeeId}&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // No photos found for this employee
          setGalleryData({ before: [], after: [], pagination: null });
          setGalleryLoading(false);
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch gallery');
      }

      const data = await response.json();
      
      // Backend returns: { before: [...], after: [...], pagination: {...} }
      // Each item in before/after arrays is an object with {url, service_name, scheduled_end}
      setGalleryData({
        before: data.before || [],
        after: data.after || [],
        pagination: data.pagination || null
      });
      
      // Update current page to match backend response
      if (data.pagination?.currentPage) {
        setCurrentPage(data.pagination.currentPage);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      setGalleryData({ before: [], after: [], pagination: null });
    } finally {
      setGalleryLoading(false);
    }
  };

  // Pair before/after photos by index to create haircut objects
  // Sort by date if available (chronological order - newest first)
  const haircuts = useMemo(() => {
    const { before, after } = galleryData;
    const maxLength = Math.max(before.length, after.length);
    const paired = [];
    
    for (let i = 0; i < maxLength; i++) {
      const beforeItem = before[i];
      const afterItem = after[i];
      
      // Backend returns: { url, service_name, scheduled_end }
      // Handle both string URLs (legacy) and object format (new)
      const beforeUrl = typeof beforeItem === 'string' ? beforeItem : beforeItem?.url || null;
      const afterUrl = typeof afterItem === 'string' ? afterItem : afterItem?.url || null;
      
      // Extract date from scheduled_end (backend sends scheduled_end)
      const date = typeof beforeItem === 'object' && beforeItem?.scheduled_end 
        ? beforeItem.scheduled_end 
        : (typeof afterItem === 'object' && afterItem?.scheduled_end ? afterItem.scheduled_end : null);
      
      // Extract services - backend sends service_name (single service per photo)
      // Collect all unique service names from both before and after items
      const servicesSet = new Set();
      if (typeof beforeItem === 'object' && beforeItem?.service_name) {
        servicesSet.add(beforeItem.service_name);
      }
      if (typeof afterItem === 'object' && afterItem?.service_name) {
        servicesSet.add(afterItem.service_name);
      }
      const services = servicesSet.size > 0 ? Array.from(servicesSet) : null;
      
      paired.push({
        id: i + 1,
        before_photo_url: beforeUrl,
        after_photo_url: afterUrl,
        date: date,
        services: services
      });
    }
    
    // Sort by date (newest first) if dates are available
    if (paired.some(h => h.date)) {
      paired.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
    }
    
    return paired;
  }, [galleryData]);

  // Get selected employee name
  const selectedEmployeeName = useMemo(() => {
    const employee = employees.find(emp => emp.employee_id === selectedEmployeeId);
    return employee?.name || 'Unknown';
  }, [employees, selectedEmployeeId]);

  // Pagination is handled by backend, so we use the pagination from API
  const pagination = galleryData.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalHaircuts = pagination?.total || 0;

  const handlePreviousPage = () => {
    if (currentPage > 1 && selectedEmployeeId && !galleryLoading) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchGallery(selectedEmployeeId, newPage);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage && selectedEmployeeId && !galleryLoading) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchGallery(selectedEmployeeId, newPage);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    setCurrentPage(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Haircut Gallery</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Stylist Filter */}
        {employees.length > 0 && (
          <div className="px-6 pt-4 pb-2 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filter by Stylist:</span>
              {employees.map((employee) => (
                <Button
                  key={employee.employee_id}
                  variant={selectedEmployeeId === employee.employee_id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleEmployeeSelect(employee.employee_id)}
                  className="text-xs"
                >
                  {employee.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <CardContent className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <Button onClick={fetchEmployees} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No stylists available</p>
            </div>
          ) : !selectedEmployeeId ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Please select a stylist</p>
            </div>
          ) : galleryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : haircuts.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium mb-2">No photos available</p>
              <p className="text-sm text-muted-foreground">
                {selectedEmployeeName} has no haircut photos to display yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid of Haircuts - 5 per page */}
              <div className="space-y-6">
                {haircuts.map((haircut, index) => (
                  <div key={haircut.id} className="space-y-4">
                    {/* Clear divider between items */}
                    {index > 0 && <div className="border-t-2 border-gray-300 my-6"></div>}
                    
                    {/* Details Section */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        {haircut.date && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Date</p>
                              <p className="font-medium">
                                {(() => {
                                  try {
                                    const date = new Date(haircut.date);
                                    if (isNaN(date.getTime())) return haircut.date;
                                    return date.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    });
                                  } catch (e) {
                                    return haircut.date;
                                  }
                                })()}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Services */}
                        {haircut.services && haircut.services.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-muted-foreground">Services:</p>
                            <div className="flex flex-wrap gap-2">
                              {haircut.services.map((service, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Before/After Photos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Before</h4>
                        {haircut.before_photo_url ? (
                          <img 
                            src={haircut.before_photo_url} 
                            alt="Before" 
                            className="w-full max-w-sm h-72 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-full max-w-sm h-72 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground text-center px-4">
                              {haircut.after_photo_url ? 'Only after photo uploaded' : 'No before photo uploaded'}
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">After</h4>
                        {haircut.after_photo_url ? (
                          <img 
                            src={haircut.after_photo_url} 
                            alt="After" 
                            className="w-full max-w-sm h-72 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-full max-w-sm h-72 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground text-center px-4">
                              {haircut.before_photo_url ? 'Only before photo uploaded' : 'No after photo uploaded'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-6 flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || !pagination?.hasPreviousPage || galleryLoading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({totalHaircuts} total)
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || !pagination?.hasNextPage || galleryLoading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
