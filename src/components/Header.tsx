'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';

export const Header = () => {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <header className="h-14 sm:h-16 fixed top-0 right-0 left-0 md:left-64 z-30 bg-background/80 backdrop-blur-md border-b border-border px-3 sm:px-6 flex items-center justify-between pl-14 sm:pl-16 md:pl-6">
            <div className="hidden sm:flex items-center gap-4 flex-1 max-w-xl">
                <div className="relative w-full">
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border-none text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground text-foreground"
                    />
                </div>
            </div>

            {/* Mobile: Show app name */}
            <div className="sm:hidden flex-1">
                <span className="font-semibold text-foreground">Vpub App</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                {/* Mobile search button */}
                <button className="sm:hidden w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
                <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors relative">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-1.5 right-2 sm:top-2 sm:right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
                </button>
                <button className="hidden sm:flex w-10 h-10 rounded-full bg-secondary items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>
        </header>
    );
};
