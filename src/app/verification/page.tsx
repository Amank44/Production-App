'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment, User } from '@/types';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast-context';

export default function VerificationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [pendingItems, setPendingItems] = useState<Equipment[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    const loadItems = React.useCallback(async () => {
        const items = await storage.getEquipment();
        const txns = await storage.getTransactions();
        const usersList = await storage.getUsers();

        setPendingItems(items.filter(i => i.status === 'PENDING_VERIFICATION'));
        setTransactions(txns);
        setUsers(usersList);
    }, []);

    useEffect(() => {
        if (user && !['MANAGER', 'ADMIN'].includes(user.role)) {
            router.push('/');
            return;
        }

        loadItems();
    }, [user, router, loadItems]);

    // Notifications handled by useToast

    const getUserName = (userId?: string) => {
        if (!userId) return 'Unknown';
        const foundUser = users.find(u => u.id === userId);
        return foundUser ? foundUser.name : userId.split('-')[0]; // Fallback to partial ID if not found
    };

    const handleVerify = async (id: string, status: 'AVAILABLE' | 'DAMAGED' | 'MAINTENANCE') => {
        try {
            // Get the item being verified
            const items = await storage.getEquipment();
            const item = items.find(i => i.id === id);

            if (!item) {
                showToast('No related transaction found for this item', 'error');
                return;
            }

            // Update the item status
            await storage.updateEquipment(id, {
                status,
                assignedTo: null as any,
                lastActivity: new Date().toISOString()
            });

            // Find related transaction to include project name in log if possible
            const transactions = await storage.getTransactions();
            const relatedTransaction = transactions.find(
                t => t.status === 'OPEN' && t.items.includes(id)
            );

            // Log verification
            if (user) {
                const projectText = relatedTransaction ? ` for project "${relatedTransaction.project || 'Unspecified'}"` : '';
                await storage.addLog({
                    id: crypto.randomUUID(),
                    action: 'VERIFY',
                    entityId: id,
                    userId: user.id,
                    timestamp: new Date().toISOString(),
                    details: `Verified item "${item.name}" (${item.barcode}) as ${status}${projectText}`
                });
            }

            if (relatedTransaction) {
                // Get all equipment to check if all items from this transaction are returned
                const updatedItems = await storage.getEquipment();
                const transactionItems = updatedItems.filter(
                    i => relatedTransaction.items.includes(i.id)
                );

                // Check if all items are no longer checked out
                const allItemsReturned = transactionItems.every(
                    i => i.status !== 'CHECKED_OUT' && i.status !== 'PENDING_VERIFICATION'
                );

                if (allItemsReturned) {
                    // Close the transaction
                    await storage.updateTransaction(relatedTransaction.id, {
                        status: 'CLOSED'
                    });

                    // Log the transaction closure
                    if (user) {
                        await storage.addLog({
                            id: crypto.randomUUID(),
                            action: 'EDIT',
                            entityId: relatedTransaction.id,
                            userId: user.id,
                            timestamp: new Date().toISOString(),
                            details: `Transaction automatically closed - all items returned and verified`,
                        });
                    }

                    showToast(`Item verified! Transaction "${relatedTransaction.project || 'Unspecified'}" has been automatically closed.`, 'success');
                } else {
                    showToast('Item verified successfully!', 'success');
                }
            } else {
                showToast('Item verified successfully', 'success');
            }

            loadItems();
        } catch (error) {
            console.error('Error verifying item:', error);
            showToast('Failed to verify item', 'error');
        }
    };

    const getItemTransaction = (itemId: string) => {
        return transactions.find(t => t.items.includes(itemId));
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Page Header - Compact */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Return Verification</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Review returned items</p>
                </div>
                {pendingItems.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{pendingItems.length} pending</span>
                    </div>
                )}
            </div>

            {pendingItems.length === 0 ? (
                <div className="bg-card rounded-2xl p-8 sm:p-12 text-center border border-border">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-lg font-semibold text-foreground mb-1">All Clear</p>
                    <p className="text-sm text-muted-foreground">No items pending verification.</p>
                </div>
            ) : (
                <div className="space-y-3 max-w-4xl">
                    {pendingItems.map((item) => {
                        const txn = getItemTransaction(item.id);
                        const projectName = txn?.project && txn.project.trim() !== '' ? txn.project : 'Unspecified Project';

                        return (
                            <div key={item.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                                {/* Header Row */}
                                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Project Icon */}
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                                </svg>
                                            </div>
                                            {/* Project Name */}
                                            <div className="min-w-0">
                                                <p className="font-bold text-foreground truncate">{projectName}</p>
                                                {txn && (
                                                    <p className="text-xs text-muted-foreground font-mono">{txn.id}</p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Pending Badge */}
                                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Pending</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Item Content */}
                                <div className="px-4 sm:px-5 py-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        {/* Item Info */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center flex-shrink-0 border border-border">
                                                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-bold text-foreground truncate">{item.name}</h3>
                                                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground uppercase">
                                                        {item.condition.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="font-mono">{item.barcode}</span>
                                                    <span>•</span>
                                                    <span>{getUserName(item.assignedTo)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons - Fixed width on desktop */}
                                        <div className="flex gap-2 sm:w-auto w-full">
                                            <button
                                                onClick={() => handleVerify(item.id, 'AVAILABLE')}
                                                className="flex-1 sm:flex-none sm:w-24 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                OK
                                            </button>
                                            <button
                                                onClick={() => handleVerify(item.id, 'DAMAGED')}
                                                className="flex-1 sm:flex-none sm:w-28 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01" />
                                                </svg>
                                                Damaged
                                            </button>
                                            <button
                                                onClick={() => handleVerify(item.id, 'MAINTENANCE')}
                                                className="sm:w-28 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="hidden sm:inline">Service</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
