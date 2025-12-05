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
        destructive: 'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20',
        success: 'border-success bg-success/10 text-success hover:bg-success/20',
        warning: 'border-warning bg-warning/10 text-warning hover:bg-warning/20',
        orange: 'border-orange bg-orange/10 text-orange hover:bg-orange/20',
    };

    return (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}>
            {children}
        </div>
    );
};
