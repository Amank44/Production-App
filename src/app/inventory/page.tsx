'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment, EquipmentStatus } from '@/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { downloadFile } from '@/lib/download';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { useAuth } from '@/lib/auth';

export default function InventoryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [items, setItems] = useState<Equipment[]>([]);
    const [users, setUsers] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'ALL'>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Equipment | 'assignedToName'; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        const loadData = async () => {
            const [equipmentData, usersData] = await Promise.all([
                storage.getEquipment(),
                storage.getUsers()
            ]);
            setItems(equipmentData);

            const userMap: Record<string, string> = {};
            usersData.forEach(u => {
                userMap[u.id] = u.name;
            });
            setUsers(userMap);
        };
        loadData();
    }, [user, router]);

    const getUserName = (id: string | undefined) => {
        if (!id) return null;
        return users[id] || id;
    };

    const handleSort = (key: keyof Equipment | 'assignedToName') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

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

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                let aValue: string | number | null | undefined = a[sortConfig.key as keyof Equipment] as string | number | null | undefined;
                let bValue: string | number | null | undefined = b[sortConfig.key as keyof Equipment] as string | number | null | undefined;

                if (sortConfig.key === 'assignedToName') {
                    aValue = getUserName(a.assignedTo) || '';
                    bValue = getUserName(b.assignedTo) || '';
                }

                const valA = (aValue ?? '').toString().toLowerCase();
                const valB = (bValue ?? '').toString().toLowerCase();

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [items, search, statusFilter, sortConfig, users]);

    const getStatusVariant = (status: EquipmentStatus) => {
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

    const SortIcon = ({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) => (
        <svg className={`w-4 h-4 ml-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground/30'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {active && direction === 'desc' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            )}
        </svg>
    );

    const handlePrintQR = async (e: React.MouseEvent, item: Equipment) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const qrModule = await import('qrcode');
            const QRCode = qrModule.default || qrModule;
            const pdfModule = await import('jspdf');
            const jsPDF = pdfModule.jsPDF || pdfModule.default;

            if (!jsPDF) throw new Error('jsPDF not loaded');

            const qrUrl = await QRCode.toDataURL(item.barcode, { width: 400, margin: 2 });

            const pdf = new jsPDF({ orientation: 'landscape', format: [100, 60], unit: 'mm' });

            pdf.setFontSize(14);
            pdf.text(item.name.substring(0, 30), 5, 8);

            pdf.addImage(qrUrl, 'PNG', 25, 12, 50, 40);

            pdf.setFontSize(10);
            pdf.text(item.barcode, 50, 56, { align: 'center' });

            downloadFile(pdf.output('blob'), `${item.barcode}_QR.pdf`, 'application/pdf');
        } catch (err) {
            console.error('QR Gen Failed', err);
            alert('Failed to generate PDF');
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between gap-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Inventory</h1>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <div className="flex bg-secondary p-0.5 sm:p-1 rounded-lg border border-border">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 sm:p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 sm:p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                        {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
                            <div className="flex gap-1 sm:gap-2">
                                <Link href="/inventory/bulk-add">
                                    <Button variant="secondary" size="sm" className="whitespace-nowrap px-2 sm:px-3">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="hidden sm:inline ml-2">Bulk Import</span>
                                    </Button>
                                </Link>
                                <Link href="/inventory/add">
                                    <Button className="whitespace-nowrap px-2 sm:px-4" size="sm">
                                        <span className="hidden sm:inline">Add Equipment</span>
                                        <span className="sm:hidden">+ Add</span>
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="w-full">
                    <Input
                        placeholder="Search by name, barcode, or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-secondary/50 border-border w-full text-sm"
                    />
                </div>
                <div className="w-full overflow-hidden -mx-3 px-3">
                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {(['ALL', 'AVAILABLE', 'CHECKED_OUT', 'PENDING_VERIFICATION', 'MAINTENANCE'] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${statusFilter === status
                                    ? 'bg-[#1d1d1f] text-white'
                                    : 'bg-transparent text-[#86868b] hover:bg-[#e8e8ed] hover:text-[#1d1d1f]'
                                    }`}
                            >
                                {status === 'ALL' ? 'All' : status === 'PENDING_VERIFICATION' ? 'Pending' : status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredItems.map((item) => (
                        <Link key={item.id} href={`/inventory/${item.id}`}>
                            <div className="group card-apple p-5 cursor-pointer">
                                {/* Top Row: Name + Status */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15px] font-semibold text-gray-900 leading-snug truncate group-hover:text-[#0071e3] transition-colors">
                                            {item.name}
                                        </h3>
                                        <p className="text-[13px] text-gray-500 mt-0.5 truncate">
                                            {item.category}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={getStatusVariant(item.status)}
                                        className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0"
                                    >
                                        {item.status === 'PENDING_VERIFICATION' ? 'Pending' : item.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                    </Badge>
                                </div>

                                {/* Info Grid */}
                                <div className="space-y-2.5 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] text-gray-400">Equipment ID</span>
                                        <span className="text-[12px] font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                                            {item.barcode}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] text-gray-400">Assigned to</span>
                                        {item.assignedTo ? (
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0071e3] to-[#00c7be] flex items-center justify-center">
                                                    <span className="text-[9px] font-bold text-white">
                                                        {getUserName(item.assignedTo)?.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <span className="text-[12px] text-gray-700 font-medium truncate max-w-[80px]">
                                                    {getUserName(item.assignedTo)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[12px] text-gray-400">—</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Row */}
                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                    <button
                                        onClick={(e) => handlePrintQR(e, item)}
                                        className="text-[12px] text-[#0071e3] font-medium flex items-center gap-1 hover:underline"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Print QR
                                    </button>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#0071e3] group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card className="overflow-hidden border-border/50 bg-secondary/30">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('name')}>
                                        <div className="flex items-center">Name <SortIcon active={sortConfig?.key === 'name'} direction={sortConfig?.direction || 'asc'} /></div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('category')}>
                                        <div className="flex items-center">Category <SortIcon active={sortConfig?.key === 'category'} direction={sortConfig?.direction || 'asc'} /></div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('barcode')}>
                                        <div className="flex items-center">Barcode <SortIcon active={sortConfig?.key === 'barcode'} direction={sortConfig?.direction || 'asc'} /></div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('status')}>
                                        <div className="flex items-center">Status <SortIcon active={sortConfig?.key === 'status'} direction={sortConfig?.direction || 'asc'} /></div>
                                    </th>
                                    <th className="px-6 py-3">
                                        <div className="flex items-center">Action</div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('assignedToName')}>
                                        <div className="flex items-center">Assigned To <SortIcon active={sortConfig?.key === 'assignedToName'} direction={sortConfig?.direction || 'asc'} /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => router.push(`/inventory/${item.id}`)}
                                        className="bg-background/50 border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{item.category}</td>
                                        <td className="px-6 py-4 font-mono text-muted-foreground">{item.barcode}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={getStatusVariant(item.status)}>
                                                {item.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => handlePrintQR(e, item)}
                                                className="text-primary hover:text-primary/80 transition-colors"
                                                title="Print QR"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">{getUserName(item.assignedTo) || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {filteredItems.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border">
                    <p>No items found matching your criteria.</p>
                </div>
            )}
        </div>
    );
}
