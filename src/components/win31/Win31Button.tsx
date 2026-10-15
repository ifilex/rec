import React from 'react';

interface Win31ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'normal' | 'transport' | 'danger';
}

export const Win31Button: React.FC<Win31ButtonProps> = ({
  children,
  className = '',
  active = false,
  size = 'md',
  variant = 'normal',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs sm:text-sm',
    lg: 'px-4 py-1.5 text-sm sm:text-base font-semibold',
  }[size];

  const variantClasses = {
    normal: 'bg-[#c0c0c0] text-black hover:bg-[#d0d0d0]',
    transport: 'bg-[#c0c0c0] text-black active:bg-[#a0a0a0] font-mono',
    danger: 'bg-[#c0c0c0] text-red-900',
  }[variant];

  const stateClasses = disabled
    ? 'opacity-50 cursor-not-allowed border-t-[#ffffff] border-l-[#ffffff] border-r-[#808080] border-b-[#808080]'
    : active
    ? 'win31-button-pressed bg-[#b0b0b0]'
    : 'win31-button active:win31-button-pressed';

  return (
    <button
      {...props}
      disabled={disabled}
      className={`select-none flex items-center justify-center gap-1.5 cursor-pointer font-sans transition-none ${sizeClasses} ${variantClasses} ${stateClasses} ${className}`}
    >
      {children}
    </button>
  );
};
