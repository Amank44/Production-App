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
    const [successMessage, setSuccessMessage] = useState('');
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

    // Clear messages after 3 seconds
    useEffect(() => {
        if (error || successMessage) {
            const timer = setTimeout(() => {
                setError('');
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, successMessage]);

    const processBarcode = (barcode: string) => {
        setError('');
        setSuccessMessage('');

        if (!barcode.trim()) return;

        const items = storage.getEquipment();
        const found = items.find(i =>
            i.barcode.toLowerCase() === barcode.toLowerCase() ||
            i.id === barcode
        );

        if (!found) {
            setError(`Item not found: ${barcode}`);
            return;
        }

        if (found.status !== 'AVAILABLE') {
            setError(`Item "${found.name}" is currently ${found.status}`);
            return;
        }

        if (cart.find(i => i.id === found.id)) {
            setError(`Item "${found.name}" is already in cart`);
            return;
        }

        setCart(prev => [...prev, found]);
        setSuccessMessage(`Added "${found.name}" to cart`);
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
        // Don't close scanner to allow continuous scanning
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
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Checkout Equipment</h1>
                <p className="text-muted-foreground">Scan items to add them to your checkout list.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6" variant="glass">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Add Items</h3>
                            <Button
                                variant={showScanner ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setShowScanner(!showScanner)}
                            >
                                {showScanner ? 'Hide Scanner' : 'Use Camera'}
                            </Button>
                        </div>

                        {showScanner && (
                            <div className="mb-6 animate-accordion-down">
                                <QRScanner
                                    onScan={handleQRScan}
                                    onError={(err) => setError(err)}
                                    continuous={true}
                                />
                                <p className="text-xs text-center text-muted-foreground mt-2">
                                    Scanner is active. Point at a QR code to add to cart.
                                </p>
                            </div>
                        )}

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

                        {/* Feedback Messages */}
                        <div className="mt-4 min-h-[1.5rem]">
                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center animate-fade-in">
                                    <svg className="w-5 h-5 text-destructive mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-sm text-destructive font-medium">{error}</p>
                                </div>
                            )}
                            {successMessage && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center animate-fade-in">
                                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{successMessage}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Cart ({cart.length})</h2>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground hover:text-destructive">
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground bg-muted/30">
                                <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p>No items in cart. Scan items to begin.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item, index) => (
                                    <Card key={`${item.id}-${index}`} className="flex items-center justify-between p-4 group hover:border-primary/50 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-medium">{item.name}</h3>
                                                <p className="text-sm text-muted-foreground">{item.barcode} • {item.category}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
                    <Card title="Checkout Details" className="sticky top-24">
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
