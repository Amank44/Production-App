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
        <div className="min-h-screen bg-background text-foreground flex">
            {!isPublicPage && <Sidebar />}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${user && !isPublicPage ? 'md:pl-64' : ''}`}>
                {!isPublicPage && <Header />}
                <main className={`flex-1 p-3 sm:p-6 lg:p-8 ${user && !isPublicPage ? 'mt-16' : ''} w-full mx-auto`}>
                    {children}
                </main>
            </div>
        </div>
    );
};
