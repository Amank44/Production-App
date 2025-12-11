'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Transaction, Equipment, User } from '@/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/Badge';

export default function TransactionsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('OPEN');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && !['MANAGER', 'ADMIN'].includes(user.role)) {
            router.push('/');
            return;
        }
        loadData();
    }, [user, router]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txns, equip, usersData] = await Promise.all([
                storage.getTransactions(),
                storage.getEquipment(),
                storage.getUsers(),
            ]);
            setTransactions(txns.reverse()); // Most recent first
            setEquipment(equip);
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUserName = (userId: string) => {
        const foundUser = users.find(u => u.id === userId);
        return foundUser?.name || 'Unknown User';
    };

    const getItemNames = (itemIds: string[]) => {
        return itemIds.map(id => {
            const item = equipment.find(e => e.id === id);
            return item?.name || 'Unknown Item';
        });
    };

    const filteredTransactions = transactions.filter(txn => {
        // Filter by status
        if (filterStatus !== 'ALL' && txn.status !== filterStatus) {
            return false;
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const userName = getUserName(txn.userId).toLowerCase();
            const project = (txn.project || '').toLowerCase();
            const itemNames = getItemNames(txn.items).join(' ').toLowerCase();

            return userName.includes(query) ||
                project.includes(query) ||
                itemNames.includes(query) ||
                txn.id.toLowerCase().includes(query);
        }

        return true;
    });

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
        return null;
    }

    return (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        Transaction Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View and manage equipment checkouts
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadData}
                    className="w-full sm:w-auto"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search by project, user, or items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === 'ALL' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('ALL')}
                            className="flex-1 sm:flex-none"
                        >
                            All
                        </Button>
                        <Button
                            variant={filterStatus === 'OPEN' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('OPEN')}
                            className="flex-1 sm:flex-none"
                        >
                            Active
                        </Button>
                        <Button
                            variant={filterStatus === 'CLOSED' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('CLOSED')}
                            className="flex-1 sm:flex-none"
                        >
                            Closed
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <p className="text-xs sm:text-sm font-medium text-blue-600">Total</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{transactions.length}</p>
                </Card>
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <p className="text-xs sm:text-sm font-medium text-green-600">Active</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">
                        {transactions.filter(t => t.status === 'OPEN').length}
                    </p>
                </Card>
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Closed</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">
                        {transactions.filter(t => t.status === 'CLOSED').length}
                    </p>
                </Card>
                <Card className="p-3 sm:p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                    <p className="text-xs sm:text-sm font-medium text-orange-600">Items Out</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">
                        {transactions.filter(t => t.status === 'OPEN').reduce((sum, t) => sum + t.items.length, 0)}
                    </p>
                </Card>
            </div>

            {/* Transactions List */}
            <Card title={`${filteredTransactions.length} Transaction${filteredTransactions.length !== 1 ? 's' : ''}`}>
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        Loading transactions...
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium mb-1">No transactions found</p>
                        <p className="text-sm">Try adjusting your filters or search query</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredTransactions.map((txn) => (
                            <div
                                key={txn.id}
                                className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background/80 transition-all cursor-pointer group"
                                onClick={() => router.push(`/transactions/${txn.id}`)}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-base truncate">
                                                {txn.project || 'Unspecified Project'}
                                            </h3>
                                            <Badge variant={txn.status === 'OPEN' ? 'success' : 'default'}>
                                                {txn.status}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-sm text-muted-foreground">
                                            <p className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {getUserName(txn.userId)}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {new Date(txn.timestampOut).toLocaleString()}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                                {txn.items.length} item{txn.items.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col gap-2 sm:items-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/transactions/${txn.id}`);
                                            }}
                                            className="flex-1 sm:flex-none group-hover:border-primary group-hover:text-primary"
                                        >
                                            {txn.status === 'OPEN' ? 'Manage' : 'View'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
