import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'orange';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'text-foreground',
        destructive: 'border-transparent bg-[#ff3b30]/10 text-[#ff3b30]',
        success: 'border-transparent bg-[#34c759]/10 text-[#34c759]',
        warning: 'border-transparent bg-[#ffcc00]/15 text-[#b38f00]',
        orange: 'border-transparent bg-[#ff9500]/15 text-[#ff9500]',
    };

    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};
