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
        <div className="space-y-6 relative">
            {/* Notification Banner removed in favor of Toasts */}

            {/* Page Header */}
            <div>
                <h1 className="text-[28px] sm:text-[34px] font-semibold text-[#1d1d1f] tracking-tight">Return Verification</h1>
                <p className="text-[15px] text-[#86868b] mt-1">Review items returned by staff.</p>
            </div>

            {pendingItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center card-apple">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f5f5f7] flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-[17px] font-medium text-[#1d1d1f] mb-1">All Clear</p>
                    <p className="text-[15px] text-[#86868b]">No items pending verification.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingItems.map((item) => (
                        <div key={item.id} className="bg-white rounded-2xl p-5 card-apple">
                            {/* Item Header */}
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-[17px] font-semibold text-[#1d1d1f]">{item.name}</h3>
                                        <span className="px-2.5 py-1 rounded-lg bg-[#f5f5f7] text-[12px] font-medium text-[#86868b]">
                                            {item.condition.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[13px] text-[#86868b]">
                                            <span className="text-[#1d1d1f] font-medium">ID:</span> {item.barcode}
                                        </p>
                                        <p className="text-[13px] text-[#86868b]">
                                            <span className="text-[#1d1d1f] font-medium">Returned by:</span> {getUserName(item.assignedTo)}
                                        </p>
                                        {(() => {
                                            const txn = getItemTransaction(item.id);
                                            return txn ? (
                                                <p className="text-[13px] text-[#86868b] flex items-center gap-2">
                                                    <span className="text-[#1d1d1f] font-medium">Project:</span>{' '}
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium">
                                                        {txn.id}
                                                    </span>
                                                    <span className="text-[13px]">
                                                        {txn.project || 'Unspecified'}
                                                    </span>
                                                </p>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>

                                {/* Status Icon */}
                                <div className="w-12 h-12 rounded-xl bg-[#ffcc00]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-[#ff9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 pt-4 border-t border-[#f5f5f7]">
                                <button
                                    onClick={() => handleVerify(item.id, 'AVAILABLE')}
                                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#34c759] text-white text-[14px] font-medium hover:bg-[#30d158] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Verify OK
                                </button>
                                <button
                                    onClick={() => handleVerify(item.id, 'DAMAGED')}
                                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#ff3b30] text-white text-[14px] font-medium hover:bg-[#ff453a] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Damaged
                                </button>
                                <button
                                    onClick={() => handleVerify(item.id, 'MAINTENANCE')}
                                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium hover:bg-[#e8e8ed] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Maintenance
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
