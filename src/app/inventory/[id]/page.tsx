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

    useEffect(() => {
        const generateQR = async (equipment: Equipment) => {
            try {
                const data = JSON.stringify({ id: equipment.id, barcode: equipment.barcode });
                const url = await QRCode.toDataURL(data, { width: 300 });
                setQrCode(url);
            } catch (err) {
                console.error(err);
            }
        };

        if (params.id) {
            const items = storage.getEquipment();
            const found = items.find(i => i.id === params.id);
            if (found) {

                // eslint-disable-next-line react-hooks/set-state-in-effect
                setItem(found);
                generateQR(found);
            }
        }
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

    if (!item) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => router.back()}>&larr; Back</Button>
                    <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
                    <Badge variant={item.status === 'AVAILABLE' ? 'success' : 'secondary'}>
                        {item.status}
                    </Badge>
                </div>
                <Button variant="outline" onClick={downloadLabel}>
                    Print Label
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card title="Details">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Barcode ID</dt>
                                <dd className="mt-1 text-lg font-mono">{item.barcode}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                                <dd className="mt-1 text-lg">{item.category}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                                <dd className="mt-1 text-lg">{item.location}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">Condition</dt>
                                <dd className="mt-1 text-lg">{item.condition}</dd>
                            </div>
                            {item.metadata?.brand && (
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Brand</dt>
                                    <dd className="mt-1 text-lg">{item.metadata.brand}</dd>
                                </div>
                            )}
                            {item.metadata?.model && (
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">Model</dt>
                                    <dd className="mt-1 text-lg">{item.metadata.model}</dd>
                                </div>
                            )}
                        </dl>
                    </Card>

                    {item.assignedTo && (
                        <Card title="Current Assignment" className="bg-blue-50/10 border-blue-500/20">
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium">Assigned to User ID: {item.assignedTo}</p>
                                    <p className="text-sm text-muted-foreground">Since {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card title="QR Code">
                        <div className="flex flex-col items-center space-y-4">
                            {qrCode && (
                                <div className="bg-white p-4 rounded-lg">
                                    <Image src={qrCode} alt="QR Code" width={200} height={200} />
                                </div>
                            )}
                            <p className="text-xs text-center text-muted-foreground">
                                Scan this code to quickly access item details or add to checkout.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
