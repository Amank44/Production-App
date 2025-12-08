'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment } from '@/types';
import { Button } from '@/components/Button';
import { downloadFile } from '@/lib/download';

const getSuffix = (index: number): string => {
    let s = '';
    let i = index;
    while (i >= 0) {
        s = String.fromCharCode((i % 26) + 65) + s;
        i = Math.floor(i / 26) - 1;
    }
    return s;
};

const guessModelCode = (name: string): string => {
    let s = name || '';
    s = s.replace(/\bIII\b/gi, '3').replace(/\bII\b/gi, '2').replace(/\bI\b/gi, '1');
    s = s.replace(/sony|canon|nikon|panasonic|fuji(film)?|blackmagic/gi, '');
    s = s.replace(/[^a-zA-Z0-9]/g, '');
    return s.toUpperCase().substring(0, 12);
};

const uuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const CATEGORY_PREFIXES: Record<string, string> = {
    'Camera': 'CAM',
    'Lens': 'LENSE',
    'Tripod': 'TRI',
    'Audio': 'AUD',
    'Lighting': 'LIGHT',
    'Monitor': 'MON',
    'Accessory': 'ACC',
    'Cable': 'CBL',
    'Battery': 'BAT',
    'Storage': 'STR',
    'Grip': 'GRIP',
    'Drone': 'DRN',
};

interface BulkRow {
    id: string;
    name: string;
    category: string;
    modelCode: string;
    quantity: number;
    location: string;
}

export default function BulkAddPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [existingItems, setExistingItems] = useState<Equipment[]>([]);
    const [defaultLocation, setDefaultLocation] = useState('Storage Room');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [rows, setRows] = useState<BulkRow[]>([
        { id: uuid(), name: '', category: 'Camera', modelCode: '', quantity: 1, location: 'Storage Room' }
    ]);

    useEffect(() => {
        const loadItems = async () => {
            try {
                const items = await storage.getEquipment();
                setExistingItems(items);
            } catch (error) {
                console.error('Failed to load inventory', error);
            } finally {
                setLoading(false);
            }
        };
        loadItems();
    }, []);

    const addRow = () => {
        setRows([...rows, {
            id: uuid(),
            name: '',
            category: 'Camera',
            modelCode: '',
            quantity: 1,
            location: defaultLocation
        }]);
    };

    const removeRow = (id: string) => {
        if (rows.length > 1) {
            setRows(rows.filter(r => r.id !== id));
        }
    };

    const updateRow = (id: string, updates: Partial<BulkRow>) => {
        setRows(rows.map(row => {
            if (row.id === id) {
                const updated = { ...row, ...updates };
                if (updates.name !== undefined) {
                    const currentGuess = guessModelCode(row.name);
                    if (!row.modelCode || row.modelCode === currentGuess) {
                        updated.modelCode = guessModelCode(updates.name);
                    }
                }
                return updated;
            }
            return row;
        }));
    };

    const getPreviewIDs = (row: BulkRow, rowIndex: number) => {
        if (!row.modelCode) return [];
        const prefix = CATEGORY_PREFIXES[row.category] || row.category.substring(0, 3).toUpperCase() || 'ITEM';
        const baseBarcode = `${prefix}${row.modelCode}`;
        const existingCount = existingItems.filter(i =>
            i.barcode.startsWith(baseBarcode) && i.barcode.length > baseBarcode.length
        ).length;

        let pendingCount = 0;
        for (let i = 0; i < rowIndex; i++) {
            const prevRow = rows[i];
            const prevPrefix = CATEGORY_PREFIXES[prevRow.category] || prevRow.category.substring(0, 3).toUpperCase() || 'ITEM';
            const prevBase = `${prevPrefix}${prevRow.modelCode}`;
            if (prevBase === baseBarcode) pendingCount += prevRow.quantity;
        }

        const startSuffixIndex = existingCount + pendingCount;
        if (row.quantity === 1) return [`${baseBarcode}${getSuffix(startSuffixIndex)}`];
        const start = `${baseBarcode}${getSuffix(startSuffixIndex)}`;
        const end = `${baseBarcode}${getSuffix(startSuffixIndex + row.quantity - 1)}`;
        return [`${start} ... ${end}`];
    };

    const handleDownloadTemplate = () => {
        const headers = ['Item Name', 'Category', 'Model Code (Optional)', 'Quantity', 'Location'];
        const rows = [
            ['Sony A7S III', 'Camera', 'A7S3', '2', 'Shelf A'],
            ['Canon 24-70mm', 'Lens', '2470', '1', 'Shelf B']
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Use helper with CSV text
        downloadFile(csvContent, 'inventory_import_template.csv', 'text/csv;charset=utf-8');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r\n|\n/);
            const newRows: BulkRow[] = [];

            // Heuristic to skip header: check if ANY cell in first row matches known headers
            const startIdx = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('category') ? 1 : 0;

            for (let i = startIdx; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Allow comma separation (simple split)
                const cols = line.split(',');
                if (cols.length < 2) continue; // Skip invalid rows

                const name = cols[0]?.trim() || '';
                const category = cols[1]?.trim() || 'Camera';
                const modelCodeRaw = cols[2]?.trim();
                const quantity = parseInt(cols[3]?.trim()) || 1;
                const loc = cols[4]?.trim() || defaultLocation;

                // Smart logic
                const modelCode = modelCodeRaw || guessModelCode(name);

                if (name) {
                    newRows.push({
                        id: uuid(),
                        name,
                        category,
                        modelCode: modelCode.toUpperCase(),
                        quantity,
                        location: loc
                    });
                }
            }

            if (newRows.length > 0) {
                let currentRows = [...rows];
                if (currentRows.length === 1 && !currentRows[0].name) {
                    currentRows = [];
                }
                setRows([...currentRows, ...newRows]);
            } else {
                alert('No valid rows found in CSV');
            }
        };
        reader.readAsText(file);
        if (e.target) e.target.value = '';
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const newEquipment: Equipment[] = [];
            const baseCounts = new Map<string, number>();

            for (const row of rows) {
                if (!row.name || !row.modelCode) continue;

                const prefix = CATEGORY_PREFIXES[row.category] || row.category.substring(0, 3).toUpperCase() || 'ITEM';
                const baseBarcode = `${prefix}${row.modelCode}`;

                if (!baseCounts.has(baseBarcode)) {
                    const count = existingItems.filter(i => i.barcode.startsWith(baseBarcode)).length;
                    baseCounts.set(baseBarcode, count);
                }

                let currentCount = baseCounts.get(baseBarcode) || 0;

                for (let q = 0; q < row.quantity; q++) {
                    const barcode = `${baseBarcode}${getSuffix(currentCount)}`;
                    newEquipment.push({
                        id: uuid(),
                        name: row.name,
                        category: row.category,
                        barcode: barcode,
                        status: 'AVAILABLE',
                        location: row.location || 'Storage',
                        condition: 'OK',
                        assignedTo: undefined,
                        lastActivity: new Date().toISOString(),
                    });
                    currentCount++;
                }
                baseCounts.set(baseBarcode, currentCount);
            }

            if (newEquipment.length === 0) {
                alert('Please add at least one valid item');
                setSaving(false);
                return;
            }

            await storage.saveEquipment(newEquipment);
            router.push('/inventory');
            router.refresh();
        } catch (error) {
            console.error('Save failed', error);
            alert('Failed to save items');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>;

    return (
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8">
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button variant="secondary" onClick={() => router.push('/inventory')} size="sm" className="shrink-0">
                        <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Button>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bulk Import</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadTemplate} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                        <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">Template</span>
                        <span className="sm:hidden">CSV</span>
                    </Button>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} size="sm" className="flex-1 sm:flex-none text-xs sm:text-sm">
                        <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="hidden sm:inline">Upload CSV</span>
                        <span className="sm:hidden">Upload</span>
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".csv"
                    />
                </div>
            </div>

            <div className="bg-secondary/20 border border-border rounded-xl p-3 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-secondary/50 rounded-lg border border-border/50">
                    <label className="text-xs sm:text-sm font-medium whitespace-nowrap">Default Location:</label>
                    <input
                        className="bg-background border border-border rounded px-3 py-1.5 text-xs sm:text-sm w-full sm:max-w-xs focus:ring-1 focus:ring-primary outline-none"
                        value={defaultLocation}
                        onChange={(e) => {
                            setDefaultLocation(e.target.value);
                            setRows(rows.map(r => ({ ...r, location: e.target.value })));
                        }}
                    />
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50 text-left">
                                <th className="py-3 px-2 font-medium text-muted-foreground w-8">#</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground min-w-[200px]">Item Name</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground w-[150px]">Category</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground w-[120px]">Model Code</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground w-[80px]">Qty</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground w-[150px]">Location</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground min-w-[150px]">ID Preview</th>
                                <th className="py-3 px-2 font-medium text-muted-foreground w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {rows.map((row, index) => (
                                <tr key={row.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-2 px-2 text-muted-foreground text-xs">{index + 1}</td>
                                    <td className="py-2 px-2">
                                        <input
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 outline-none"
                                            value={row.name}
                                            onChange={(e) => updateRow(row.id, { name: e.target.value })}
                                            placeholder="Item Name"
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            list="categories"
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 outline-none"
                                            value={row.category}
                                            onChange={(e) => updateRow(row.id, { category: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 outline-none font-mono uppercase text-xs"
                                            value={row.modelCode}
                                            onChange={(e) => updateRow(row.id, { modelCode: e.target.value.toUpperCase() })}
                                            placeholder="CODE"
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 outline-none text-center"
                                            value={row.quantity}
                                            onChange={(e) => updateRow(row.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <input
                                            className="w-full bg-background border border-border rounded px-2 py-1.5 outline-none"
                                            value={row.location}
                                            onChange={(e) => updateRow(row.id, { location: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-2 px-2">
                                        <div className="flex flex-col gap-1">
                                            {getPreviewIDs(row, index).map(id => (
                                                <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary font-mono border border-primary/20 whitespace-nowrap">
                                                    {id}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                        <button onClick={() => removeRow(row.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {rows.map((row, index) => (
                        <div key={row.id} className="bg-background border border-border rounded-lg p-4 space-y-4 shadow-sm relative">
                            <div className="flex justify-between items-center border-b border-border/50 pb-2">
                                <span className="text-sm font-medium text-muted-foreground">Item #{index + 1}</span>
                                <button onClick={() => removeRow(row.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Item Name</label>
                                    <input
                                        className="w-full bg-background border border-border rounded px-3 py-2 outline-none text-sm"
                                        value={row.name}
                                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
                                        placeholder="E.g. Sony A7S III"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                                        <input
                                            list="categories"
                                            className="w-full bg-background border border-border rounded px-3 py-2 outline-none text-sm"
                                            value={row.category}
                                            onChange={(e) => updateRow(row.id, { category: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Model Code</label>
                                        <input
                                            className="w-full bg-background border border-border rounded px-3 py-2 outline-none font-mono uppercase text-xs"
                                            value={row.modelCode}
                                            onChange={(e) => updateRow(row.id, { modelCode: e.target.value.toUpperCase() })}
                                            placeholder="CODE"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-background border border-border rounded px-3 py-2 outline-none text-sm"
                                            value={row.quantity}
                                            onChange={(e) => updateRow(row.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                                        <input
                                            className="w-full bg-background border border-border rounded px-3 py-2 outline-none text-sm"
                                            value={row.location}
                                            onChange={(e) => updateRow(row.id, { location: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="bg-secondary/20 rounded p-2">
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">ID Preview</label>
                                    <div className="flex flex-wrap gap-1">
                                        {getPreviewIDs(row, index).map(id => (
                                            <span key={id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary font-mono border border-primary/20 whitespace-nowrap">
                                                {id}
                                            </span>
                                        ))}
                                        {(!row.modelCode) && <span className="text-xs text-muted-foreground italic">Enter model code...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-border/50 gap-3 sm:gap-4">
                    <Button variant="secondary" onClick={addRow} size="sm" className="w-full sm:w-auto">Add Row</Button>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                            Total: <span className="font-medium text-foreground">{rows.reduce((acc, r) => acc + r.quantity, 0)}</span>
                        </div>
                        <Button onClick={handleSave} disabled={saving || rows.some(r => !r.name || !r.modelCode)} size="sm" className="flex-1 sm:flex-none">
                            {saving ? 'Saving...' : 'Import All'}
                        </Button>
                    </div>
                </div>
            </div>

            <datalist id="categories">
                {Object.keys(CATEGORY_PREFIXES).map(cat => (
                    <option key={cat} value={cat} />
                ))}
            </datalist>
        </div>
    );
}
