'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { PullToRefresh } from '@/components/PullToRefresh';
import { useToast } from '@/lib/toast-context';
import { useConfirm } from '@/lib/dialog-context';

export default function InventoryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();
    const confirm = useConfirm();
    const [items, setItems] = useState<Equipment[]>([]);
    const [users, setUsers] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'ALL'>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Equipment | 'assignedToName'; direction: 'asc' | 'desc' } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }
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

    const filteredItems = useMemo(() => {
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

    const toggleSelect = (e: React.MouseEvent | React.ChangeEvent, itemId: string) => {
        e.stopPropagation();
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === filteredItems.length && filteredItems.length > 0) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredItems.map(item => item.id)));
        }
    };

    const handleCleanupAssignments = async () => {
        const itemsToCleanup = items.filter(i => i.status === 'AVAILABLE' && i.assignedTo);
        if (itemsToCleanup.length === 0) {
            showToast('No stale assignments found', 'info');
            return;
        }

        const isConfirmed = await confirm({
            title: 'Cleanup Database?',
            message: `Found ${itemsToCleanup.length} available items with stale assignments. Clear them now?`,
            confirmLabel: 'Clear All',
            variant: 'danger'
        });

        if (!isConfirmed) return;

        setIsLoading(true);
        try {
            await Promise.all(itemsToCleanup.map(item =>
                storage.updateEquipment(item.id, { assignedTo: null as any })
            ));
            showToast('Database cleanup complete!', 'success');
            await loadData();
        } catch (error) {
            console.error('Cleanup failed:', error);
            showToast('Cleanup failed', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkDownloadQR = async () => {
        if (selectedItems.size === 0) {
            alert('Please select at least one item');
            return;
        }

        setIsGeneratingQR(true);
        try {
            const qrModule = await import('qrcode');
            const QRCode = qrModule.default || qrModule;
            const pdfModule = await import('jspdf');
            const jsPDF = pdfModule.jsPDF || pdfModule.default;

            if (!jsPDF) throw new Error('jsPDF not loaded');

            const pdf = new jsPDF({ orientation: 'portrait', format: 'a4', unit: 'mm' });
            const pageWidth = 210;
            const pageHeight = 297;

            const cols = 4;
            const rows = 5;
            const qrSize = 35;
            const cellWidth = pageWidth / cols;
            const cellHeight = (pageHeight - 20) / rows;
            const marginTop = 10;
            const marginLeft = (cellWidth - qrSize) / 2;

            const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
            const itemsPerPage = cols * rows;

            for (let i = 0; i < selectedItemsArray.length; i++) {
                const item = selectedItemsArray[i];
                const positionOnPage = i % itemsPerPage;
                const row = Math.floor(positionOnPage / cols);
                const col = positionOnPage % cols;

                if (positionOnPage === 0 && i > 0) {
                    pdf.addPage();
                }

                const x = col * cellWidth + marginLeft;
                const y = marginTop + row * cellHeight;

                const qrUrl = await QRCode.toDataURL(item.barcode, { width: 300, margin: 1 });
                pdf.addImage(qrUrl, 'PNG', x, y, qrSize, qrSize);

                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text(item.barcode, x + qrSize / 2, y + qrSize + 5, { align: 'center' });
            }

            downloadFile(pdf.output('blob'), `QR_Codes_${selectedItems.size}_items.pdf`, 'application/pdf');
            setSelectedItems(new Set());
        } catch (err) {
            console.error('Bulk QR Gen Failed', err);
            showToast('Failed to generate QR codes', 'error');
        } finally {
            setIsGeneratingQR(false);
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

            {viewMode === 'list' && (
                <div className="flex items-center justify-between bg-secondary/30 rounded-lg px-4 py-2 border border-border">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-border accent-primary"
                            />
                            <span className="text-sm text-muted-foreground">
                                {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                            </span>
                        </label>
                    </div>
                    {selectedItems.size > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleBulkDownloadQR}
                            disabled={isGeneratingQR}
                            className="gap-2"
                        >
                            {isGeneratingQR ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Download QR Codes ({selectedItems.size})
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}

            <PullToRefresh onRefresh={loadData}>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredItems.map((item) => (
                            <Link key={item.id} href={`/inventory/${item.id}`}>
                                <div className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[14px] font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                                                {item.name}
                                            </h3>
                                        </div>
                                        <Badge
                                            variant={getStatusVariant(item.status)}
                                            className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0"
                                        >
                                            {item.status === 'PENDING_VERIFICATION' ? 'Pending' : item.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                                        <span>{item.category}</span>
                                        <span className="font-mono text-gray-400">{item.barcode}</span>
                                    </div>

                                    {item.status !== 'AVAILABLE' && item.assignedTo && (
                                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
                                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center">
                                                <span className="text-[8px] font-bold text-white">
                                                    {getUserName(item.assignedTo)?.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-[11px] text-gray-600 truncate">
                                                {getUserName(item.assignedTo)}
                                            </span>
                                        </div>
                                    )}
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
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-border accent-primary"
                                            />
                                        </th>
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
                                            className={`border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer ${selectedItems.has(item.id) ? 'bg-primary/5' : 'bg-background/50'}`}
                                        >
                                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={(e) => toggleSelect(e, item.id)}
                                                    className="w-4 h-4 rounded border-border accent-primary"
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{item.category}</td>
                                            <td className="px-6 py-4 font-mono text-muted-foreground">{item.barcode}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant={getStatusVariant(item.status)}>
                                                    {item.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
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
                                            <td className="px-6 py-4 text-muted-foreground">{item.status !== 'AVAILABLE' ? (getUserName(item.assignedTo) || '-') : '-'}</td>
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
            </PullToRefresh>
        </div>
    );
}
