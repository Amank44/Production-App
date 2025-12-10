'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/lib/sidebar-context';

export const Header = () => {
    const { user } = useAuth();
    const { isCollapsed } = useSidebar();

    if (!user) return null;

    return (
        // Desktop only - mobile uses MobileHeader component
        <header className={`h-[44px] fixed top-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#f5f5f7] px-4 hidden md:flex items-center justify-between transition-all duration-300 ${isCollapsed ? 'left-[72px]' : 'left-[260px]'
            } pl-6`}>
            {/* Page title area */}
            <div className="flex-1">
                <span className="font-semibold text-[#1d1d1f] text-[15px]">Vpub App</span>
            </div>

            <div className="flex items-center gap-2">
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors relative">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff3b30] rounded-full"></span>
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>
        </header>
    );
};
