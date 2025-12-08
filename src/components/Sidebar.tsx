'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export const Sidebar = () => {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const isActive = (path: string) => pathname === path;

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', roles: ['MANAGER', 'ADMIN'] },
        { name: 'Inventory', path: '/inventory', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['CREW', 'MANAGER', 'ADMIN'] },
        { name: 'Checkout', path: '/checkout', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z', roles: ['CREW', 'MANAGER', 'ADMIN'] },
        { name: 'Returns', path: '/returns', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', roles: ['CREW', 'MANAGER', 'ADMIN'] },
        { name: 'Verification', path: '/verification', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['MANAGER', 'ADMIN'] },
        { name: 'Users', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', roles: ['ADMIN'] },
    ];

    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    // Close mobile menu when path changes
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    if (!user) return null;

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed top-3 left-3 z-50 p-2 bg-secondary rounded-lg border border-border text-foreground shadow-lg active:scale-95 transition-transform"
            >
                {isMobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )}
            </button>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden animate-fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-screen w-64 bg-secondary border-r border-border z-40 transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:flex md:flex-col
            `}>
                <div className="p-6 flex items-center gap-3 pl-16 md:pl-6">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                        <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="font-bold text-xl tracking-tight text-foreground">Vpub App</span>
                </div>

                <nav className="flex-1 px-4 space-y-3 mt-4 overflow-y-auto">
                    {navItems.map((item) => (
                        item.roles.includes(user.role) && (
                            <Link key={item.path} href={item.path} className="block">
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive(item.path)
                                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                                    }`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                    </svg>
                                    <span className="font-medium">{item.name}</span>
                                </div>
                            </Link>
                        )
                    ))}
                </nav>

                <div className="p-4 border-t border-border mt-auto">
                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-medium text-sm truncate text-foreground">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors py-2 rounded-lg hover:bg-destructive/10"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
