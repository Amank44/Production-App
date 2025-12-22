'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Transaction, Equipment, User, Log } from '@/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/Badge';
import { QRScanner, MobileScanner } from '@/components/QRScanner';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/dialog-context';

export default function TransactionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const confirm = useConfirm();
    const transactionId = params.id as string;

    const [transaction, setTransaction] = useState<Transaction | null>(null);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
    const [transactionUser, setTransactionUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
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

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [txns, equip, users, allLogs] = await Promise.all([
                storage.getTransactions(),
                storage.getEquipment(),
                storage.getUsers(),
                storage.getLogs(),
            ]);

            const txn = txns.find(t => t.id === transactionId);
            if (!txn) {
                showToast('Transaction not found', 'error');
                router.push('/transactions');
                return;
            }

            const txnUser = users.find(u => u.id === txn.userId);
            const available = equip.filter(e => e.status === 'AVAILABLE');

            // Filter logs for this transaction
            const transactionLogs = allLogs
                .filter(l => l.entityId === transactionId)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setTransaction(txn);
            setEquipment(equip);
            setAvailableEquipment(available);
            setTransactionUser(txnUser || null);
            setAllUsers(users);
            setLogs(transactionLogs);
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Error loading transaction data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getItemDetails = (itemId: string) => {
        return equipment.find(e => e.id === itemId);
    };

    const getUserName = (userId?: string) => {
        if (!userId) return 'System / Guest';
        const found = allUsers.find(u => u.id === userId);
        return found ? found.name : 'Unknown User';
    };

    const handleAddItem = async (itemId: string) => {
        if (!transaction || transaction.status !== 'OPEN') {
            showToast('Cannot modify closed transactions', 'error');
            return;
        }

        if (transaction.items.includes(itemId)) {
            showToast('Item already in this transaction', 'error');
            return;
        }

        const item = equipment.find(e => e.id === itemId);
        if (!item) {
            alert('Item not found');
            return;
        }

        // If item is not available, check if it's assigned to this transaction (should be caught by includes check above)
        // But if it's assigned to OTHER transaction, block it.
        if (item.status !== 'AVAILABLE') {
            showToast(`Item is not available (Current Status: ${item.status})`, 'error');
            return;
        }

        setSaving(true);
        try {
            // Update transaction
            await storage.updateTransaction(transaction.id, {
                items: [...transaction.items, itemId],
                preCheckoutConditions: {
                    ...transaction.preCheckoutConditions,
                    [itemId]: item.condition,
                },
            });

            // Update item status
            await storage.updateEquipment(itemId, {
                status: 'CHECKED_OUT',
                assignedTo: transaction.userId,
                lastActivity: new Date().toISOString()
            });

            // Log the change
            await storage.addLog({
                id: crypto.randomUUID(),
                action: 'EDIT',
                entityId: transaction.id,
                userId: user!.id,
                timestamp: new Date().toISOString(),
                details: `Added item: ${item.name} (${item.barcode}) to transaction "${transaction.project || 'Unspecified'}"`,
            });

            await loadData(true);
            setSearchQuery('');
            setShowAddItem(false);
            setShowQRScanner(false);
            showToast(`Successfully added ${item.name}`, 'success');
        } catch (error) {
            console.error('Error adding item:', error);
            showToast('Error adding item to transaction', 'error');
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
            showToast('Item not found', 'error');
            return;
        }

        const isConfirmed = await confirm({
            title: 'Remove Item?',
            message: `Are you sure you want to remove ${item.name} from this transaction?`,
            confirmLabel: 'Remove',
            variant: 'danger'
        });

        if (!isConfirmed) return;

        setSaving(true);
        try {
            // Update transaction
            const updatedItems = transaction.items.filter(id => id !== itemId);
            const updatedConditions = { ...transaction.preCheckoutConditions };
            delete updatedConditions[itemId];

            await storage.updateTransaction(transaction.id, {
                items: updatedItems,
                preCheckoutConditions: updatedConditions,
            });

            // Update item status back to available
            await storage.updateEquipment(itemId, {
                status: 'AVAILABLE',
                assignedTo: null as any,
                lastActivity: new Date().toISOString()
            });

            // Log the change
            await storage.addLog({
                id: crypto.randomUUID(),
                action: 'EDIT',
                entityId: transaction.id,
                userId: user!.id,
                timestamp: new Date().toISOString(),
                details: `Removed item: ${item.name} (${item.barcode}) from transaction "${transaction.project || 'Unspecified'}"`,
            });

            await loadData(true);
            showToast(`Successfully removed ${item.name}`, 'success');
        } catch (error) {
            console.error('Error removing item:', error);
            showToast('Error removing item from transaction', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleQRScan = async (decodedText: string) => {
        const item = equipment.find(e => e.barcode === decodedText || e.id === decodedText);
        if (item) {
            await handleAddItem(item.id);
        } else {
            showToast('Item not found with this barcode', 'error');
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

    // Prepare list of all involved users
    const primaryUserName = transactionUser?.name || 'Unknown User';
    const additionalUserNames = (transaction.additionalUsers || [])
        .map(id => getUserName(id))
        .filter(name => name !== 'Unknown User');
    const allMemberNames = [primaryUserName, ...additionalUserNames];

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push('/transactions')}
                        className="shrink-0 mt-1 sm:mt-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                            {transaction.project || 'Unspecified Project'}
                        </h1>
                        <p className="text-xs sm:text-sm font-medium text-primary mt-0.5">
                            {transaction.id}
                        </p>
                    </div>
                </div>
                <Badge variant={transaction.status === 'OPEN' ? 'success' : 'default'} className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 shrink-0 mt-1 sm:mt-0">
                    {transaction.status}
                </Badge>
            </div>

            {/* Transaction Info Cards - Desktop: Grid, Mobile: Compact Single Card */}
            {/* Desktop View */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Checked Out By</p>
                    <div className="space-y-1">
                        {allMemberNames.map((name, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span className={`font-semibold ${index === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {name} {index === 0 && '(Primary)'}
                                </span>
                            </div>
                        ))}
                    </div>
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

            {/* Mobile View - Compact Single Card */}
            <div className="sm:hidden bg-white dark:bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Checked Out By</p>
                        <p className="font-semibold text-sm truncate">{primaryUserName}</p>
                        {additionalUserNames.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                                +{additionalUserNames.length} more: {additionalUserNames.join(', ')}
                            </p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Items</p>
                        <p className="font-bold text-2xl text-primary leading-none">{transaction.items.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{new Date(transaction.timestampOut).toLocaleDateString()}</span>
                        <span className="mx-1.5">•</span>
                        <span>{new Date(transaction.timestampOut).toLocaleTimeString()}</span>
                    </p>
                </div>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Add Item
                        </Button>
                    )}
                </div>

                {/* Add Item Section - Premium UI */}
                {showAddItem && transaction.status === 'OPEN' && (
                    <div className="mb-8 animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
                                <div>
                                    <h3 className="font-bold text-[17px]">Add Equipment</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">Search or scan to add items to this active transaction</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAddItem(false)}
                                    className="hover:bg-muted rounded-full w-8 h-8 p-0"
                                >
                                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </Button>
                            </div>

                            <div className="p-5 space-y-5">
                                {/* Search & Scan Controls */}
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <svg className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Search by name, barcode, or category..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-12 pl-11 pr-4 bg-muted border border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 rounded-2xl text-[15px] transition-all outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    <Button
                                        onClick={() => setShowQRScanner(!showQRScanner)}
                                        className={`h-12 px-5 rounded-2xl border-0 shadow-lg shadow-blue-500/20 active:scale-95 transition-all ${showQRScanner ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#0071e3] hover:bg-[#0077ED] text-white'}`}
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {showQRScanner ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                            )}
                                        </svg>
                                        {showQRScanner ? 'Close' : 'Scan'}
                                    </Button>
                                </div>

                                {showQRScanner && (
                                    <div className="h-[320px] rounded-2xl overflow-hidden border border-border shadow-inner bg-black">
                                        {isMobile ? (
                                            <MobileScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />
                                        ) : (
                                            <QRScanner onScan={handleQRScan} />
                                        )}
                                    </div>
                                )}

                                {/* Results List */}
                                <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                                    {filteredAvailableItems.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium">No available items found</p>
                                            <p className="text-xs mt-1">Try a different search term</p>
                                        </div>
                                    ) : (
                                        filteredAvailableItems.map(item => (
                                            <div
                                                key={item.id}
                                                className="group flex items-center justify-between p-3 pl-3 pr-4 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-md transition-all duration-200"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-[15px] truncate group-hover:text-primary transition-colors">{item.name}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.barcode}</span>
                                                            <span className="text-xs text-muted-foreground truncate">• {item.category}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAddItem(item.id)}
                                                    isLoading={saving}
                                                    className="rounded-xl px-5 h-9 bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-colors font-medium"
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Items - Compact List */}
                <div className="space-y-2">
                    {transaction.items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No items in this transaction</p>
                        </div>
                    ) : (
                        transaction.items.map((itemId, index) => {
                            const item = getItemDetails(itemId);
                            if (!item) return null;

                            return (
                                <div
                                    key={itemId}
                                    className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border group hover:border-muted-foreground/30 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center text-sm font-bold shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {item.category} • {item.barcode} • <span className="font-medium">{transaction.preCheckoutConditions[itemId] || item.condition}</span>
                                        </p>
                                    </div>
                                    {transaction.status === 'OPEN' && (
                                        <button
                                            onClick={() => handleRemoveItem(itemId)}
                                            disabled={saving}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors shrink-0 opacity-60 group-hover:opacity-100"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            {/* Activity History Log - Compact */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Activity History</h3>
                    <span className="text-xs text-muted-foreground">{logs.length} entries</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3 italic">No activity recorded</p>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-border last:border-0">
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0 mt-0.5">
                                    {getUserName(log.userId).charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                                        <span className="font-medium not-italic text-foreground">{getUserName(log.userId)}</span>
                                        {' — '}
                                        {log.details || log.action}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))
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
