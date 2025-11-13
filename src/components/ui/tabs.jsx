import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext();

const Tabs = ({ defaultValue, value, onValueChange, className = '', children, ...props }) => {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  
  const handleValueChange = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setSelectedValue(newValue);
    }
  };

  const currentValue = value !== undefined ? value : selectedValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex items-center justify-center gap-0 rounded-full border border-border bg-muted text-muted-foreground ${className}`}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef(({ className = '', value, children, ...props }, ref) => {
  const { value: selectedValue, onValueChange } = useContext(TabsContext);
  const isSelected = selectedValue === value;

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full border border-transparent px-6 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? 'bg-white text-foreground shadow-none'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
      } ${className}`}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef(({ className = '', value, children, ...props }, ref) => {
  const { value: selectedValue } = useContext(TabsContext);
  
  if (selectedValue !== value) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
