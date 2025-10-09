import React from 'react';
import { cn } from '@/lib/utils';

interface MaterialTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  floating?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export function MaterialTextarea({
  variant = 'primary',
  size = 'medium',
  label,
  helper,
  error,
  required = false,
  floating = false,
  resize = 'vertical',
  className,
  id,
  ...props
}: MaterialTextareaProps) {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'input-material input-material--textarea';
  
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
  ].filter(Boolean);
  
  const textareaElement = (
    <textarea
      id={inputId}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        specialClasses,
        className
      )}
      style={{ resize }}
      {...props}
    />
  );
  
  if (floating) {
    return (
      <div className="input-floating">
        {textareaElement}
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
      
      {textareaElement}
      
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
