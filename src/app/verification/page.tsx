'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment } from '@/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { useAuth } from '@/lib/auth';

export default function VerificationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [pendingItems, setPendingItems] = useState<Equipment[]>([]);

    const loadItems = React.useCallback(async () => {
        const items = await storage.getEquipment();
        setPendingItems(items.filter(i => i.status === 'PENDING_VERIFICATION'));
    }, []);

    useEffect(() => {
        if (user && !['MANAGER', 'ADMIN'].includes(user.role)) {
            router.push('/');
            return;
        }

        loadItems();
    }, [user, router, loadItems]);

    const handleVerify = async (id: string, status: 'AVAILABLE' | 'DAMAGED' | 'MAINTENANCE') => {
        await storage.updateEquipment(id, {
            status,
            assignedTo: undefined, // Clear assignment
            lastActivity: new Date().toISOString()
        });
        loadItems();
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Return Verification</h1>
                <p className="text-sm text-muted-foreground mt-1">Review items returned by staff.</p>
            </div>

            {pendingItems.length === 0 ? (
                <div className="text-center py-10 sm:py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground text-sm">
                    No items pending verification.
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {pendingItems.map((item) => (
                        <Card key={item.id} className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-base sm:text-lg truncate">{item.name}</h3>
                                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{item.condition.replace('_', ' ')}</Badge>
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1">ID: {item.barcode}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Returned by: {item.assignedTo}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 sm:border-0 sm:pt-0">
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleVerify(item.id, 'AVAILABLE')}
                                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                                >
                                    Verify OK
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleVerify(item.id, 'DAMAGED')}
                                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                                >
                                    Damage
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleVerify(item.id, 'MAINTENANCE')}
                                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                                >
                                    Maintenance
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
