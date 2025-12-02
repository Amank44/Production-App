'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { storage } from '@/lib/storage';
import { Equipment, EquipmentStatus } from '@/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { useAuth } from '@/lib/auth';

export default function InventoryPage() {
    const { user } = useAuth();
    const [items, setItems] = useState<Equipment[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'ALL'>('ALL');

    useEffect(() => {
        const loadData = () => {
            setItems(storage.getEquipment());
        };
        loadData();
    }, []);

    const filteredItems = React.useMemo(() => {
        let result = items;

        if (search) {
            const q = search.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(q) ||
                item.barcode.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'ALL') {
            result = result.filter(item => item.status === statusFilter);
        }

        return result;
    }, [items, search, statusFilter]);

    const getStatusVariant = (status: EquipmentStatus) => {
        switch (status) {
            case 'AVAILABLE': return 'success';
            case 'CHECKED_OUT': return 'warning';
            case 'PENDING_VERIFICATION': return 'secondary';
            case 'DAMAGED': return 'destructive';
            case 'LOST': return 'destructive';
            case 'MAINTENANCE': return 'secondary';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                {user?.role === 'MANAGER' && (
                    <Link href="/inventory/add">
                        <Button>Add Equipment</Button>
                    </Link>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <Input
                        placeholder="Search by name, barcode, or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {(['ALL', 'AVAILABLE', 'CHECKED_OUT', 'PENDING_VERIFICATION', 'MAINTENANCE'] as const).map((status) => (
                        <Button
                            key={status}
                            variant={statusFilter === status ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(status)}
                            className="whitespace-nowrap"
                        >
                            {status === 'ALL' ? 'All' : status.replace('_', ' ')}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                    <Link key={item.id} href={`/inventory/${item.id}`}>
                        <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{item.name}</h3>
                                    <p className="text-sm text-muted-foreground">{item.category}</p>
                                </div>
                                <Badge variant={getStatusVariant(item.status)}>
                                    {item.status.replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID:</span>
                                    <span className="font-mono">{item.barcode}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Location:</span>
                                    <span>{item.location}</span>
                                </div>
                                {item.assignedTo && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Assigned:</span>
                                        <span>{item.assignedTo}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Link>
                ))}

                {filteredItems.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No items found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
