import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
    footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, description, footer }) => {
    return (
        <div className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${className}`}>
            {(title || description) && (
                <div className="flex flex-col space-y-1.5 p-6">
                    {title && <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>}
                    {description && <p className="text-sm text-muted-foreground">{description}</p>}
                </div>
            )}
            <div className="p-6 pt-0">
                {children}
            </div>
            {footer && (
                <div className="flex items-center p-6 pt-0">
                    {footer}
                </div>
            )}
        </div>
    );
};
