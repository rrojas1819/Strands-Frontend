import React from 'react';

const Badge = React.forwardRef(({ className = '', variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground',
    secondary: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground',
    destructive: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-destructive text-destructive-foreground',
    outline: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground',
  };

  return (
    <div
      ref={ref}
      className={`${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export { Badge };
