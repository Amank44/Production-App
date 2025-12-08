'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const pathname = usePathname();
    const isPublicPage = pathname === '/login' || pathname === '/';

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
            {!isPublicPage && <Sidebar />}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${user && !isPublicPage ? 'md:pl-64' : ''}`}>
                {!isPublicPage && <Header />}
                <main className={`flex-1 px-3 py-4 sm:p-6 lg:p-8 ${user && !isPublicPage ? 'mt-14 sm:mt-16 pb-20 sm:pb-6' : ''} w-full mx-auto overflow-x-hidden`}>
                    {children}
                </main>
            </div>
        </div>
    );
};
