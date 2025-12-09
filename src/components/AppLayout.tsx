'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, useSidebar } from '@/lib/sidebar-context';

const MainContent = ({ children, isPublicPage }: { children: React.ReactNode; isPublicPage: boolean }) => {
    const { user } = useAuth();
    const { isCollapsed } = useSidebar();

    return (
        <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${user && !isPublicPage
                ? isCollapsed
                    ? 'md:pl-[72px]'
                    : 'md:pl-[260px]'
                : ''
            }`}>
            {!isPublicPage && <Header />}
            <main className={`flex-1 px-3 py-4 sm:p-6 lg:p-8 ${user && !isPublicPage ? 'mt-14 sm:mt-16 pb-20 sm:pb-6' : ''} w-full mx-auto overflow-x-hidden`}>
                {children}
            </main>
        </div>
    );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const pathname = usePathname();
    const isPublicPage = pathname === '/login' || pathname === '/';

    // Wrap with SidebarProvider only for authenticated pages
    if (isPublicPage || !user) {
        return (
            <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
                <div className="flex-1 flex flex-col min-h-screen min-w-0">
                    <main className="flex-1 w-full mx-auto overflow-x-hidden">
                        {children}
                    </main>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider>
            <div className="min-h-screen bg-background text-foreground flex overflow-x-hidden">
                <Sidebar />
                <MainContent isPublicPage={isPublicPage}>
                    {children}
                </MainContent>
            </div>
        </SidebarProvider>
    );
};
