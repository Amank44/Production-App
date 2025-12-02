'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Transaction } from '@/types';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        checkedOut: 0,
        maintenance: 0,
        damaged: 0,
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

    const loadDashboardData = React.useCallback(() => {
        const items = storage.getEquipment();
        const transactions = storage.getTransactions();

        setStats({
            total: items.length,
            available: items.filter(i => i.status === 'AVAILABLE').length,
            checkedOut: items.filter(i => i.status === 'CHECKED_OUT').length,
            maintenance: items.filter(i => i.status === 'MAINTENANCE').length,
            damaged: items.filter(i => i.status === 'DAMAGED' || i.status === 'LOST').length,
        });

        setRecentTransactions(transactions.slice(-5).reverse());
    }, []);

    useEffect(() => {
        if (user && user.role !== 'MANAGER') {
            router.push('/');
            return;
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDashboardData();
    }, [user, router, loadDashboardData]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-blue-500/10 border-blue-500/20">
                    <p className="text-sm font-medium text-blue-500">Total Equipment</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                </Card>
                <Card className="p-6 bg-green-500/10 border-green-500/20">
                    <p className="text-sm font-medium text-green-500">Available</p>
                    <p className="text-3xl font-bold">{stats.available}</p>
                </Card>
                <Card className="p-6 bg-orange-500/10 border-orange-500/20">
                    <p className="text-sm font-medium text-orange-500">Checked Out</p>
                    <p className="text-3xl font-bold">{stats.checkedOut}</p>
                </Card>
                <Card className="p-6 bg-red-500/10 border-red-500/20">
                    <p className="text-sm font-medium text-red-500">Attention Needed</p>
                    <p className="text-3xl font-bold">{stats.maintenance + stats.damaged}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="Recent Transactions">
                    {recentTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No recent transactions.</p>
                    ) : (
                        <div className="space-y-4">
                            {recentTransactions.map((t) => (
                                <div key={t.id} className="flex justify-between items-start border-b border-border pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium">{t.project || 'Unspecified Project'}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(t.timestampOut).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm">{t.items.length} items</p>
                                        <p className="text-xs text-muted-foreground">User: {t.userId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="System Health">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Storage Usage</span>
                            <span className="text-sm font-medium">Local Storage</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: '25%' }}></div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Data is currently stored in browser LocalStorage. Ensure to export data regularly.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
