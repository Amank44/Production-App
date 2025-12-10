'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const pageNames: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/inventory': 'Inventory',
    '/checkout': 'Checkout',
    '/returns': 'Returns',
    '/verification': 'Verification',
    '/admin/users': 'Users',
    '/profile': 'Profile',
};

export const MobileHeader = () => {
    const { user } = useAuth();
    const pathname = usePathname();

    if (!user) return null;

    // Get page name from pathname
    const getPageName = () => {
        // Check for exact matches first
        if (pageNames[pathname]) return pageNames[pathname];

        // Check for sub-routes
        for (const [path, name] of Object.entries(pageNames)) {
            if (pathname.startsWith(path + '/')) {
                // For detail pages, we might want different text
                if (pathname.includes('/inventory/')) {
                    return 'Item Details';
                }
                return name;
            }
        }

        return 'Vpub';
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-40 md:hidden">
            {/* Glassmorphic background */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-b border-[#e5e5ea]" />

            {/* Content */}
            <div className="relative flex items-center justify-center h-11 px-4 pt-safe-top">
                <h1 className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.4px]">
                    {getPageName()}
                </h1>
            </div>
        </header>
    );
};
