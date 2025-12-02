'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment, Transaction } from '@/types';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { QRScanner } from '@/components/QRScanner';
import { useAuth } from '@/lib/auth';

export default function CheckoutPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [cart, setCart] = useState<Equipment[]>([]);
    const [scanInput, setScanInput] = useState('');
    const [error, setError] = useState('');
    const [project, setProject] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [suggestions, setSuggestions] = useState<Equipment[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Redirect if not staff
    useEffect(() => {
        if (user && user.role !== 'STAFF') {
            router.push('/');
        }
    }, [user, router]);

    const processBarcode = (barcode: string) => {
        setError('');

        if (!barcode.trim()) return;

        const items = storage.getEquipment();
        const found = items.find(i =>
            i.barcode.toLowerCase() === barcode.toLowerCase() ||
            i.id === barcode
        );

        if (!found) {
            setError('Item not found');
            return;
        }

        if (found.status !== 'AVAILABLE') {
            setError(`Item is currently ${found.status}`);
            return;
        }

        if (cart.find(i => i.id === found.id)) {
            setError('Item already in cart');
            return;
        }

        setCart([...cart, found]);
        setScanInput('');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleInputChange = (value: string) => {
        setScanInput(value);
        setError('');

        if (value.trim().length > 0) {
            const items = storage.getEquipment();
            const filtered = items.filter(item =>
                item.status === 'AVAILABLE' &&
                !cart.find(c => c.id === item.id) &&
                (
                    item.name.toLowerCase().includes(value.toLowerCase()) ||
                    item.barcode.toLowerCase().includes(value.toLowerCase()) ||
                    item.category.toLowerCase().includes(value.toLowerCase())
                )
            ).slice(0, 5); // Limit to 5 suggestions
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (item: Equipment) => {
        processBarcode(item.barcode);
    };

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        processBarcode(scanInput);
    };

    const handleQRScan = (decodedText: string) => {
        try {
            // Try to parse as JSON (QR codes from inventory detail page)
            const data = JSON.parse(decodedText);
            if (data.barcode) {
                processBarcode(data.barcode);
            } else if (data.id) {
                processBarcode(data.id);
            } else {
                processBarcode(decodedText);
            }
        } catch {
            // If not JSON, treat as plain barcode
            processBarcode(decodedText);
        }
        setShowScanner(false);
    };

    const removeFromCart = (id: string) => {
        setCart(cart.filter(i => i.id !== id));
    };

    const handleCheckout = async () => {
        if (!user) return;
        if (cart.length === 0) return;

        setIsLoading(true);
        try {
            const transaction: Transaction = {
                id: crypto.randomUUID(),
                userId: user.id,
                items: cart.map(i => i.id),
                timestampOut: new Date().toISOString(),
                project: project || 'Unspecified Project',
                preCheckoutConditions: cart.reduce((acc, item) => ({
                    ...acc,
                    [item.id]: item.condition
                }), {}),
                status: 'OPEN'
            };

            // Save transaction
            storage.saveTransaction(transaction);

            // Update item status
            cart.forEach(item => {
                storage.updateEquipment(item.id, {
                    status: 'CHECKED_OUT',
                    assignedTo: user.id,
                    lastActivity: new Date().toISOString()
                });
            });

            // Clear cart and redirect
            setCart([]);
            router.push('/returns');
        } catch (err) {
            console.error(err);
            setError('Failed to process checkout');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Checkout Equipment</h1>
                <p className="text-muted-foreground">Scan items to add them to your checkout list.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Manual Entry</h3>
                            <Button
                                variant={showScanner ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setShowScanner(!showScanner)}
                            >
                                {showScanner ? 'Hide Scanner' : 'Use Camera'}
                            </Button>
                        </div>
                        <form onSubmit={handleScan} className="relative">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Scan barcode or enter ID..."
                                    value={scanInput}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    onFocus={() => scanInput && setShowSuggestions(suggestions.length > 0)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    autoFocus={!showScanner}
                                    className="flex-1"
                                />
                                <Button type="submit">Add</Button>
                            </div>

                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                                    {suggestions.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSuggestionClick(item)}
                                            className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-0 flex items-center justify-between"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.barcode} • {item.category}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground ml-2">{item.location}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                    </Card>

                    {showScanner && (
                        <QRScanner
                            onScan={handleQRScan}
                            onError={(err) => setError(err)}
                        />
                    )}

                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Cart ({cart.length})</h2>
                        {cart.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground">
                                No items in cart. Scan items to begin.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <Card key={item.id} className="flex items-center justify-between p-4">
                                        <div>
                                            <h3 className="font-medium">{item.name}</h3>
                                            <p className="text-sm text-muted-foreground">{item.barcode}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            Remove
                                        </Button>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <Card title="Checkout Details">
                        <div className="space-y-4">
                            <Input
                                label="Project / Shoot Name"
                                placeholder="e.g. Documentary Shoot A"
                                value={project}
                                onChange={(e) => setProject(e.target.value)}
                            />

                            <div className="pt-4 border-t border-border">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Total Items:</span>
                                    <span className="font-medium">{cart.length}</span>
                                </div>
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0 || isLoading}
                                    isLoading={isLoading}
                                >
                                    Confirm Checkout
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
