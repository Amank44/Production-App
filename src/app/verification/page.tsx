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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Return Verification</h1>
            <p className="text-muted-foreground">Review items returned by staff.</p>

            {pendingItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                    No items pending verification.
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingItems.map((item) => (
                        <Card key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg">{item.name}</h3>
                                    <Badge variant="secondary">{item.condition.replace('_', ' ')}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">ID: {item.barcode}</p>
                                <p className="text-sm text-muted-foreground">Returned by: {item.assignedTo}</p>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    variant="success"
                                    onClick={() => handleVerify(item.id, 'AVAILABLE')}
                                    className="flex-1 sm:flex-none"
                                >
                                    Verify OK
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => handleVerify(item.id, 'DAMAGED')}
                                    className="flex-1 sm:flex-none"
                                >
                                    Report Damage
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => handleVerify(item.id, 'MAINTENANCE')}
                                    className="flex-1 sm:flex-none"
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
