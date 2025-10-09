import React from 'react';
import { cn } from '@/lib/utils';

interface MaterialInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
  floating?: boolean;
  search?: boolean;
  password?: boolean;
  file?: boolean;
}

export function MaterialInput({
  variant = 'primary',
  size = 'medium',
  label,
  helper,
  error,
  required = false,
  icon,
  floating = false,
  search = false,
  password = false,
  file = false,
  className,
  id,
  ...props
}: MaterialInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'input-material';
  
  const variantClasses = {
    primary: 'input-material--primary',
    success: 'input-material--success',
    warning: 'input-material--warning',
    error: 'input-material--error',
    info: 'input-material--info',
  };
  
  const sizeClasses = {
    small: 'input-material--small',
    medium: '',
    large: 'input-material--large',
  };
  
  const specialClasses = [
    floating && 'input-material--floating',
    search && 'input-material--search',
    password && 'input-material--password',
    file && 'input-material--file',
  ].filter(Boolean);
  
  const inputElement = (
    <input
      id={inputId}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        specialClasses,
        className
      )}
      {...props}
    />
  );
  
  if (file) {
    return (
      <div className="input-file">
        {inputElement}
        {label && (
          <div className="text-center mt-2">
            <span className="text-sm text-gray-600">{label}</span>
          </div>
        )}
      </div>
    );
  }
  
  if (floating) {
    return (
      <div className="input-floating">
        {inputElement}
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && <span className="input-label--required" />}
          </label>
        )}
        {error && (
          <div className="input-error">
            <span>{error}</span>
          </div>
        )}
        {helper && !error && (
          <div className="input-helper">{helper}</div>
        )}
      </div>
    );
  }
  
  return (
    <div className="input-group">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-label--required" />}
        </label>
      )}
      
      <div className={cn(
        icon && 'input-with-icon',
        search && 'input-search',
        password && 'input-password'
      )}>
        {inputElement}
        {icon && <div className="input-icon">{icon}</div>}
        {search && <div className="input-search-icon">🔍</div>}
      </div>
      
      {error && (
        <div className="input-error">
          <span>{error}</span>
        </div>
      )}
      {helper && !error && (
        <div className="input-helper">{helper}</div>
      )}
    </div>
  );
}
