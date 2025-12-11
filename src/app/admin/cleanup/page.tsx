'use client';

import React, { useState } from 'react';
import { storage } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function TransactionCleanupPage() {
    const [checking, setChecking] = useState(false);
    const [results, setResults] = useState<{
        total: number;
        closed: number;
        details: string[];
    } | null>(null);

    const checkAndCloseTransactions = async () => {
        setChecking(true);
        setResults(null);

        try {
            const transactions = await storage.getTransactions();
            const equipment = await storage.getEquipment();

            const openTransactions = transactions.filter(t => t.status === 'OPEN');
            let closedCount = 0;
            const details: string[] = [];

            for (const transaction of openTransactions) {
                // Get all items from this transaction
                const transactionItems = equipment.filter(
                    item => transaction.items.includes(item.id)
                );

                // Check if all items are no longer checked out or pending
                const allItemsReturned = transactionItems.every(
                    item => item.status !== 'CHECKED_OUT' && item.status !== 'PENDING_VERIFICATION'
                );

                if (allItemsReturned) {
                    // Close this transaction
                    await storage.updateTransaction(transaction.id, {
                        status: 'CLOSED'
                    });

                    // Log the closure
                    await storage.addLog({
                        id: crypto.randomUUID(),
                        action: 'EDIT',
                        entityId: transaction.id,
                        userId: 'SYSTEM',
                        timestamp: new Date().toISOString(),
                        details: `Transaction auto-closed by cleanup script - all items were already returned`,
                    });

                    closedCount++;
                    details.push(
                        `✅ Closed: "${transaction.project || 'Unspecified'}" (${transaction.items.length} items)`
                    );
                } else {
                    const stillOut = transactionItems.filter(
                        item => item.status === 'CHECKED_OUT' || item.status === 'PENDING_VERIFICATION'
                    ).length;
                    details.push(
                        `⏳ Still Open: "${transaction.project || 'Unspecified'}" (${stillOut}/${transaction.items.length} items still out)`
                    );
                }
            }

            setResults({
                total: openTransactions.length,
                closed: closedCount,
                details
            });
        } catch (error) {
            console.error('Error checking transactions:', error);
            alert('Error checking transactions. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Transaction Cleanup</h1>
                <p className="text-muted-foreground mt-2">
                    Check and close transactions where all items have been returned
                </p>
            </div>

            <Card className="p-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm">
                            <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                What does this do?
                            </p>
                            <p className="text-blue-700 dark:text-blue-300">
                                This tool scans all open transactions and automatically closes any where all items
                                have already been returned and verified. This is useful for cleaning up old transactions
                                that should have been closed but weren't due to the previous system not having auto-close functionality.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={checkAndCloseTransactions}
                        disabled={checking}
                        size="lg"
                        className="w-full"
                    >
                        {checking ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Checking Transactions...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Check & Close Transactions
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {results && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Results</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Checked</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{results.total}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Auto-Closed</p>
                            <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">{results.closed}</p>
                        </div>
                    </div>

                    {results.details.length > 0 && (
                        <div>
                            <h3 className="font-medium mb-3">Details:</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {results.details.map((detail, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg text-sm font-mono ${detail.startsWith('✅')
                                                ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                                                : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                                            }`}
                                    >
                                        {detail}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {results.closed > 0 && (
                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm">
                                    <p className="font-medium text-green-900 dark:text-green-100">
                                        Success! {results.closed} transaction{results.closed !== 1 ? 's' : ''} closed.
                                    </p>
                                    <p className="text-green-700 dark:text-green-300 mt-1">
                                        All changes have been logged in the system audit trail.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {results.closed === 0 && (
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        No transactions needed closing.
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                                        All open transactions still have items checked out or pending verification.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <Card className="p-6 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm">
                        <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                            Note: One-Time Use
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300">
                            This cleanup tool is primarily for migrating old data. Going forward, transactions will
                            automatically close when all items are verified, so you shouldn't need to run this regularly.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
