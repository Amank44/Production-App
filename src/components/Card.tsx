import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
    footer?: React.ReactNode;
    variant?: 'default' | 'glass' | 'outline';
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    title,
    description,
    footer,
    variant = 'default',
    hover = false
}) => {
    const variants = {
        default: 'bg-secondary border-border shadow-sm',
        glass: 'glass text-foreground',
        outline: 'bg-transparent border-border text-foreground'
    };

    const hoverStyles = hover ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 hover:bg-secondary/80' : '';

    return (
        <div className={`rounded-xl border ${variants[variant]} ${hoverStyles} ${className}`}>
            {(title || description) && (
                <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
                    {title && <h3 className="text-xl sm:text-2xl font-semibold leading-none tracking-tight">{title}</h3>}
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            )}
            <div className={`p-3 sm:p-6 ${title || description ? 'pt-0' : ''}`}>
                {children}
            </div>
            {footer && (
                <div className="flex items-center p-4 sm:p-6 pt-0">
                    {footer}
                </div>
            )}
        </div>
    );
};
