import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                    {label}
                </label>
            )}
            <input
                className={`flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive focus:ring-destructive' : ''
                    } ${className}`}
                {...props}
            />
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
        </div>
    );
};
