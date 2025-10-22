import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning" // warning, danger, success
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'success':
        return 'bg-green-500 hover:bg-green-600 text-white';
      default:
        return 'bg-blue-500 hover:bg-blue-600 text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl font-semibold text-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            {message}
          </p>
          
          <div className="flex space-x-3 justify-center">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-6"
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              className={`px-6 ${getButtonStyle()}`}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmationModal;
