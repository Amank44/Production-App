'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function ProfilePage() {
    const router = useRouter();
    const { user, logout } = useAuth();

    React.useEffect(() => {
        if (!user) {
            router.push('/login');
        }
    }, [user, router]);

    if (!user) return null;

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const menuItems = [
        {
            label: 'Verification',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            path: '/verification',
            roles: ['MANAGER', 'ADMIN']
        },
        {
            label: 'Manage Users',
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
            path: '/admin/users',
            roles: ['ADMIN']
        },
    ];

    const visibleMenuItems = menuItems.filter(item => item.roles.includes(user.role));

    return (
        <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
            {/* Profile Header */}
            <div className="flex flex-col items-center py-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5856d6] to-[#af52de] flex items-center justify-center text-white font-semibold text-3xl mb-4 shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-xl font-semibold text-[#1d1d1f]">{user.name}</h1>
                <p className="text-[15px] text-[#86868b]">{user.role}</p>
            </div>

            {/* Account Section */}
            <div className="space-y-2">
                <p className="section-header-ios">Account</p>
                <div className="grouped-container">
                    <div className="list-item-native flex items-center justify-between">
                        <span className="text-[15px] text-[#1d1d1f]">Email</span>
                        <span className="text-[15px] text-[#86868b]">{user.email || 'Not set'}</span>
                    </div>
                    <div className="list-item-native flex items-center justify-between">
                        <span className="text-[15px] text-[#1d1d1f]">Role</span>
                        <span className="text-[15px] text-[#86868b]">{user.role}</span>
                    </div>
                    <div className="list-item-native flex items-center justify-between">
                        <span className="text-[15px] text-[#1d1d1f]">User ID</span>
                        <span className="text-[13px] text-[#86868b] font-mono">{user.id.substring(0, 8)}...</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions for Managers/Admins */}
            {visibleMenuItems.length > 0 && (
                <div className="space-y-2">
                    <p className="section-header-ios">Management</p>
                    <div className="grouped-container">
                        {visibleMenuItems.map((item, index) => (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className="list-item-native w-full flex items-center gap-3"
                            >
                                <span className="text-[#0071e3]">{item.icon}</span>
                                <span className="text-[15px] text-[#1d1d1f] flex-1 text-left">{item.label}</span>
                                <svg className="w-4 h-4 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* App Info */}
            <div className="space-y-2">
                <p className="section-header-ios">About</p>
                <div className="grouped-container">
                    <div className="list-item-native flex items-center justify-between">
                        <span className="text-[15px] text-[#1d1d1f]">Version</span>
                        <span className="text-[15px] text-[#86868b]">2.0.0</span>
                    </div>
                    <div className="list-item-native flex items-center justify-between">
                        <span className="text-[15px] text-[#1d1d1f]">Build</span>
                        <span className="text-[15px] text-[#86868b]">Production</span>
                    </div>
                </div>
            </div>

            {/* Logout Button */}
            <div className="px-4 pt-4">
                <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-white rounded-xl text-[#ff3b30] text-[17px] font-medium active:bg-[#f5f5f7] transition-colors shadow-sm"
                >
                    Sign Out
                </button>
            </div>

            {/* Footer spacing for bottom tab bar */}
            <div className="h-4" />
        </div>
    );
}
