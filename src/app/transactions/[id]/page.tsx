'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Transaction, Equipment, User } from '@/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/Badge';
import { QRScanner, MobileScanner } from '@/components/QRScanner';

export default function TransactionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const transactionId = params.id as string;

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
    const [transactionUser, setTransactionUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Add item states
    const [showAddItem, setShowAddItem] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (user && !['MANAGER', 'ADMIN'].includes(user.role)) {
            router.push('/');
            return;
        }
        loadData();
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    }, [user, router, transactionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txns, equip, users] = await Promise.all([
                storage.getTransactions(),
                storage.getEquipment(),
                storage.getUsers(),
            ]);

            const txn = txns.find(t => t.id === transactionId);
            if (!txn) {
                alert('Transaction not found');
                router.push('/transactions');
                return;
            }

            const txnUser = users.find(u => u.id === txn.userId);
            const available = equip.filter(e => e.status === 'AVAILABLE');

            setTransaction(txn);
            setEquipment(equip);
            setAvailableEquipment(available);
            setTransactionUser(txnUser || null);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading transaction data');
        } finally {
            setLoading(false);
        }
    };

    const getItemDetails = (itemId: string) => {
        return equipment.find(e => e.id === itemId);
    };

    const handleAddItem = async (itemId: string) => {
        if (!transaction || transaction.status !== 'OPEN') {
            alert('Cannot modify closed transactions');
            return;
        }

        if (transaction.items.includes(itemId)) {
            alert('Item already in this transaction');
            return;
        }

        const item = equipment.find(e => e.id === itemId);
        if (!item) {
            alert('Item not found');
            return;
        }

        if (item.status !== 'AVAILABLE') {
            alert('Item is not available for checkout');
            return;
        }

        setSaving(true);
        try {
            // Update transaction
            const updatedTransaction: Transaction = {
                ...transaction,
                items: [...transaction.items, itemId],
                preCheckoutConditions: {
                    ...transaction.preCheckoutConditions,
                    [itemId]: item.condition,
                },
            };

            // Update item status
            const updatedItem: Equipment = {
                ...item,
                status: 'CHECKED_OUT',
                assignedTo: transaction.userId,
            };

            await storage.updateTransaction(updatedTransaction.id, updatedTransaction);
            await storage.updateEquipment(updatedItem.id, updatedItem);

            // Log the change
            await storage.addLog({
                id: crypto.randomUUID(),
                action: 'EDIT',
                entityId: transaction.id,
                userId: user!.id,
                timestamp: new Date().toISOString(),
                details: `Added item: ${item.name} (${item.barcode})`,
            });

            alert(`Successfully added ${item.name} to transaction`);
            setSearchQuery('');
            setShowAddItem(false);
            setShowQRScanner(false);
            await loadData();
        } catch (error) {
            console.error('Error adding item:', error);
            alert('Error adding item to transaction');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!transaction || transaction.status !== 'OPEN') {
            alert('Cannot modify closed transactions');
            return;
        }

        const item = getItemDetails(itemId);
        if (!item) {
            alert('Item not found');
            return;
        }

        const confirmed = confirm(`Remove ${item.name} from this transaction?`);
        if (!confirmed) return;

        setSaving(true);
        try {
            // Update transaction
            const updatedItems = transaction.items.filter(id => id !== itemId);
            const updatedConditions = { ...transaction.preCheckoutConditions };
            delete updatedConditions[itemId];

            const updatedTransaction: Transaction = {
                ...transaction,
                items: updatedItems,
                preCheckoutConditions: updatedConditions,
            };

            // Update item status back to available
            const updatedItem: Equipment = {
                ...item,
                status: 'AVAILABLE',
                assignedTo: undefined,
            };

            await storage.updateTransaction(updatedTransaction.id, updatedTransaction);
            await storage.updateEquipment(updatedItem.id, updatedItem);

            // Log the change
            await storage.addLog({
                id: crypto.randomUUID(),
                action: 'EDIT',
                entityId: transaction.id,
                userId: user!.id,
                timestamp: new Date().toISOString(),
                details: `Removed item: ${item.name} (${item.barcode})`,
            });

            alert(`Successfully removed ${item.name} from transaction`);
            await loadData();
        } catch (error) {
            console.error('Error removing item:', error);
            alert('Error removing item from transaction');
        } finally {
            setSaving(false);
        }
    };

    const handleQRScan = async (decodedText: string) => {
        const item = equipment.find(e => e.barcode === decodedText || e.id === decodedText);
        if (item) {
            await handleAddItem(item.id);
        } else {
            alert('Item not found with this barcode');
        }
    };

    const filteredAvailableItems = availableEquipment.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.name.toLowerCase().includes(query) ||
            item.barcode.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        );
    });

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading transaction...</p>
                </div>
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Transaction not found</p>
                <Button onClick={() => router.push('/transactions')} className="mt-4">
                    Back to Transactions
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/transactions')}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            {transaction.project || 'Unspecified Project'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Transaction ID: {transaction.id.substring(0, 8)}...
                        </p>
                    </div>
                </div>
                <Badge variant={transaction.status === 'OPEN' ? 'success' : 'default'} className="text-sm px-3 py-1">
                    {transaction.status}
                </Badge>
            </div>

            {/* Transaction Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Checked Out By</p>
                    <p className="font-semibold">{transactionUser?.name || 'Unknown User'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{transactionUser?.email}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Checkout Time</p>
                    <p className="font-semibold">{new Date(transaction.timestampOut).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {new Date(transaction.timestampOut).toLocaleTimeString()}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Total Items</p>
                    <p className="font-semibold text-2xl">{transaction.items.length}</p>
                </Card>
            </div>

            {/* Items List */}
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold">Checked Out Items</h2>
                    {transaction.status === 'OPEN' && (
                        <Button
                            size="sm"
                            onClick={() => setShowAddItem(!showAddItem)}
                            disabled={saving}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Item
                        </Button>
                    )}
                </div>

                {/* Add Item Section */}
                {showAddItem && transaction.status === 'OPEN' && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">Add Item to Transaction</h3>

                        <div className="flex gap-2 mb-3">
                            <Input
                                type="text"
                                placeholder="Search by name, barcode, or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowQRScanner(!showQRScanner)}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </Button>
                        </div>

                        {showQRScanner && (
                            <div className="mb-3">
                                {isMobile ? (
                                    <MobileScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />
                                ) : (
                                    <QRScanner onScan={handleQRScan} />
                                )}
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredAvailableItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No available items found
                                </p>
                            ) : (
                                filteredAvailableItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded border border-border hover:border-primary transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.category} • {item.barcode}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddItem(item.id)}
                                            disabled={saving}
                                        >
                                            Add
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Current Items */}
                <div className="space-y-3">
                    {transaction.items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No items in this transaction</p>
                        </div>
                    ) : (
                        transaction.items.map(itemId => {
                            const item = getItemDetails(itemId);
                            if (!item) return null;

                            return (
                                <div
                                    key={itemId}
                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-background/50 rounded-lg border border-border gap-3"
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{item.name}</h3>
                                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>{item.category}</span>
                                                <span>•</span>
                                                <span>{item.barcode}</span>
                                                <span>•</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {transaction.preCheckoutConditions[itemId] || item.condition}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    {transaction.status === 'OPEN' && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleRemoveItem(itemId)}
                                            disabled={saving}
                                            className="w-full sm:w-auto"
                                        >
                                            <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span className="hidden sm:inline">Remove</span>
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            {transaction.status === 'CLOSED' && (
                <Card className="p-4 bg-gray-50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Transaction Closed</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                This transaction has been closed and cannot be modified. All items have been returned.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
