import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ children, value, onValueChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking inside the select
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleValueChange = (newValue) => {
    console.log('Select value changing to:', newValue);
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className="relative w-full" {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            isOpen,
            setIsOpen,
            value,
            onValueChange: handleValueChange
          });
        }
        return child;
      })}
    </div>
  );
};

const SelectTrigger = React.forwardRef(({ className = '', children, isOpen, setIsOpen, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={`flex min-h-[44px] h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation ${className}`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('SelectTrigger clicked, current isOpen:', isOpen);
      setIsOpen(!isOpen);
    }}
    {...props}
  >
    {children}
    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
  </button>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = React.forwardRef(({ className = '', placeholder, value, children, ...props }, ref) => {
  // If children are provided, render them (for custom display)
  // Otherwise, show value or placeholder
  const displayContent = children || value || placeholder;
  const isEmpty = !value && !children;
  
  return (
  <span
    ref={ref}
      className={`block truncate ${isEmpty ? 'text-gray-500' : 'text-gray-900'} ${className}`}
    {...props}
  >
      {displayContent}
  </span>
  );
});
SelectValue.displayName = 'SelectValue';

const SelectContent = React.forwardRef(({ className = '', children, isOpen, onValueChange, ...props }, ref) => {
  if (!isOpen) return null;
  
  return (
    <div
      ref={ref}
      className={`absolute z-[9999] w-full min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg top-full left-0 right-0 mt-1 max-h-[50vh] overflow-y-auto ${className}`}
      style={{ position: 'absolute', zIndex: 9999 }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      {...props}
    >
      <div className="py-1">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              onValueChange
            });
          }
          return child;
        })}
      </div>
    </div>
  );
});
SelectContent.displayName = 'SelectContent';

const SelectItem = React.forwardRef(({ className = '', children, value, onValueChange, ...props }, ref) => (
  <div
    ref={ref}
    className={`relative flex w-full cursor-pointer items-center rounded-sm py-2 px-3 text-sm text-gray-900 hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:text-blue-900 focus:outline-none transition-colors duration-150 ${className}`}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('SelectItem clicked:', value, 'onValueChange exists:', !!onValueChange);
      if (onValueChange && value) {
        console.log('Calling onValueChange with:', value);
        onValueChange(value);
      } else {
        console.warn('onValueChange not available or value is missing');
      }
    }}
    onMouseDown={(e) => {
      // Stop propagation but don't prevent default to allow click event to fire
      e.stopPropagation();
    }}
    role="option"
    tabIndex={0}
    {...props}
  >
    {children}
  </div>
));
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };