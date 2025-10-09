import React from 'react';
import { cn } from '@/lib/utils';

interface MaterialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'text' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  icon?: boolean;
  fab?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function MaterialButton({
  variant = 'primary',
  size = 'medium',
  icon = false,
  fab = false,
  loading = false,
  className,
  children,
  disabled,
  ...props
}: MaterialButtonProps) {
  const baseClasses = 'btn-material';
  
  const variantClasses = {
    primary: 'btn-material--primary',
    secondary: 'btn-material--secondary',
    outlined: 'btn-material--outlined',
    text: 'btn-material--text',
    success: 'btn-material--success',
    warning: 'btn-material--warning',
    error: 'btn-material--error',
    info: 'btn-material--info',
  };
  
  const sizeClasses = {
    small: 'btn-material--small',
    medium: '',
    large: 'btn-material--large',
  };
  
  const specialClasses = [
    icon && 'btn-material--icon',
    fab && 'btn-material--fab',
    loading && 'btn-material--loading',
  ].filter(Boolean);
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        specialClasses,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}
