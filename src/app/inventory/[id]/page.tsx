'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment } from '@/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import QRCode from 'qrcode';
import Image from 'next/image';
import jsPDF from 'jspdf';

export default function ItemDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Equipment | null>(null);
    const [qrCode, setQrCode] = useState<string>('');
    const [assignedUser, setAssignedUser] = useState<string>('');

    useEffect(() => {
        const loadItem = async () => {
            if (!params.id) return;

            const items = await storage.getEquipment();
            const found = items.find(i => i.id === params.id);

            if (found) {
                setItem(found);
                try {
                    const data = JSON.stringify({ id: found.id, barcode: found.barcode });
                    const url = await QRCode.toDataURL(data, { width: 300 });
                    setQrCode(url);

                    if (found.assignedTo) {
                        const users = await storage.getUsers();
                        const user = users.find(u => u.id === found.assignedTo);
                        if (user) {
                            setAssignedUser(user.name);
                        } else {
                            setAssignedUser(found.assignedTo); // Fallback to ID if user not found
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        };

        loadItem();
    }, [params.id]);

    const downloadLabel = () => {
        if (!item || !qrCode) return;

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [50, 30] // 50mm x 30mm label
        });

        doc.addImage(qrCode, 'PNG', 2, 2, 26, 26);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(item.barcode, 30, 8);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        const nameLines = doc.splitTextToSize(item.name, 18);
        doc.text(nameLines, 30, 12);

        doc.text(item.category, 30, 20);

        doc.save(`${item.barcode}-label.pdf`);
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'success';
            case 'CHECKED_OUT': return 'orange';
            case 'PENDING_VERIFICATION': return 'warning';
            case 'DAMAGED': return 'destructive';
            case 'LOST': return 'destructive';
            case 'MAINTENANCE': return 'destructive';
            default: return 'default';
        }
    };

    if (!item) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()} className="hover:bg-secondary/50">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </Button>
                    <div className="hidden sm:block h-8 w-px bg-border mx-2"></div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{item.name}</h1>
                        <Badge variant={getStatusVariant(item.status) as any}>
                            {item.status.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                <Button variant="outline" onClick={downloadLabel} className="gap-2 w-full sm:w-auto justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print Label
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div className="space-y-6 h-full">
                    <Card className="h-full flex flex-col">
                        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Item Details
                        </h3>
                        <dl className="space-y-5 flex-1">
                            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Barcode ID
                                </dt>
                                <dd className="font-mono text-sm bg-background px-2 py-1 rounded border border-border">{item.barcode}</dd>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    Category
                                </dt>
                                <dd className="text-sm font-medium">{item.category}</dd>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Location
                                </dt>
                                <dd className="text-sm font-medium">{item.location}</dd>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Condition
                                </dt>
                                <dd className="text-sm font-medium">{item.condition}</dd>
                            </div>
                            {item.metadata?.brand && (
                                <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                                    <dt className="text-sm font-medium text-muted-foreground">Brand</dt>
                                    <dd className="text-sm font-medium">{item.metadata.brand}</dd>
                                </div>
                            )}
                            {item.metadata?.model && (
                                <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
                                    <dt className="text-sm font-medium text-muted-foreground">Model</dt>
                                    <dd className="text-sm font-medium">{item.metadata.model}</dd>
                                </div>
                            )}
                        </dl>
                    </Card>

                    {item.assignedTo && (
                        <Card className="bg-primary/5 border-primary/20">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-primary">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Current Assignment
                            </h3>
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                                    {assignedUser.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Assigned to {assignedUser}</p>
                                    <p className="text-sm text-muted-foreground">Active since {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-6 h-full">
                    <Card className="h-full flex flex-col items-center justify-center p-8">
                        <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 w-full">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            QR Code
                        </h3>
                        <div className="flex flex-col items-center space-y-6 flex-1 justify-center">
                            {qrCode && (
                                <div className="bg-white p-4 rounded-xl shadow-lg shadow-white/5">
                                    <Image src={qrCode} alt="QR Code" width={200} height={200} className="w-auto h-auto" />
                                </div>
                            )}
                            <p className="text-sm text-center text-muted-foreground max-w-xs">
                                Scan this code to quickly access item details or add to checkout.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
