import { ReactNode, MouseEventHandler } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ButtonProps {
  children?: ReactNode;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export default function Button({
  children,
  isLoading,
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
  onClick,
}: ButtonProps) {
  const baseClasses =
    'w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-telegram-blue hover:bg-telegram-blue-dark text-white',
    secondary: 'bg-telegram-bg-light hover:bg-telegram-bg-lighter text-white',
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  );
}
