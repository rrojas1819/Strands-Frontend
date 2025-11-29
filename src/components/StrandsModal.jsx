import React from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

// Custom modal component for Strands design system
// Replaces ugly browser alerts with branded popups

const StrandsModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "info", // info, warning, success
  confirmButtonId = null
}) => {
  if (!isOpen) return null;

  // Different icons and colors based on modal type
  // Makes it clear what kind of action user is taking

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50';
      case 'success':
        return 'bg-green-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-md bg-white shadow-2xl border-0 my-auto">
        <CardContent className="p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center space-x-3 ${getIconBg()} p-3 rounded-lg`}>
              {getIcon()}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {cancelText}
            </Button>
            <Button
              id={confirmButtonId}
              onClick={onConfirm}
              className={`px-6 py-2 text-white font-medium ${
                type === 'warning' 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrandsModal;