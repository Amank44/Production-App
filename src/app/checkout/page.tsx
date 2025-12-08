'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment, Transaction, User } from '@/types';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Select } from '@/components/Select';
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

    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Redirect if not authorized
    useEffect(() => {
        if (user && !['CREW', 'MANAGER', 'ADMIN'].includes(user.role)) {
            router.push('/');
        }
    }, [user, router]);

    // Fetch equipment and users (if admin/manager) on mount
    useEffect(() => {
        const fetchData = async () => {
            const items = await storage.getEquipment();
            setEquipmentList(items);

            if (user && ['MANAGER', 'ADMIN'].includes(user.role)) {
                const userList = await storage.getUsers();
                setUsers(userList);
            }
        };
        fetchData();
    }, [user]);

    // Set default selected user
    useEffect(() => {
        if (user) {
            setSelectedUserId(user.id);
        }
    }, [user]);

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

    const lastProcessedRef = React.useRef<{ code: string; time: number } | null>(null);

    const playSuccessSound = () => {
        const audio = new Audio('/sounds/beep.mp3'); // We'll need to create this or use a data URI
        // Using a simple oscillator beep for now to avoid external dependencies
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);

        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    };

    const processBarcode = (barcode: string) => {
        const normalizedBarcode = barcode.trim();
        // Prevent processing the same barcode multiple times within a short window
        const now = Date.now();
        if (lastProcessedRef.current &&
            lastProcessedRef.current.code.toLowerCase() === normalizedBarcode.toLowerCase() &&
            now - lastProcessedRef.current.time < 2000) {
            return;
        }

        setError('');
        setSuccessMessage('');

        if (!normalizedBarcode) return;

        // Use local state instead of synchronous storage call
        const found = equipmentList.find(i =>
            i.barcode.toLowerCase() === normalizedBarcode.toLowerCase() ||
            i.id === normalizedBarcode
        );

        if (!found) {
            setError(`Item not found: ${normalizedBarcode}`);
            // Update last processed even on error to prevent spamming error messages
            lastProcessedRef.current = { code: normalizedBarcode, time: now };
            return;
        }

        if (found.status !== 'AVAILABLE') {
            setError(`Item "${found.name}" is currently ${found.status}`);
            lastProcessedRef.current = { code: normalizedBarcode, time: now };
            return;
        }

        // Check against current state (might be stale in rapid succession)
        if (cart.find(i => i.id === found.id)) {
            setError(`Item "${found.name}" is already in cart`);
            lastProcessedRef.current = { code: normalizedBarcode, time: now };
            return;
        }

        // Use functional update to ensure we check the latest state directly
        setCart(prev => {
            if (prev.find(i => i.id === found.id)) {
                return prev;
            }
            // Only play sound and show message if actually adding
            setTimeout(() => {
                setSuccessMessage(`Added "${found.name}" to cart`);
                playSuccessSound();
            }, 0);
            return [...prev, found];
        });

        setScanInput('');
        setSuggestions([]);
        setShowSuggestions(false);
        lastProcessedRef.current = { code: normalizedBarcode, time: now };
    };

    const handleInputChange = (value: string) => {
        setScanInput(value);
        setError('');

        if (value.trim().length > 0) {
            const filtered = equipmentList.filter(item =>
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
                userId: selectedUserId,
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
                    assignedTo: selectedUserId,
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
        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8 pb-20">
            <div className="flex flex-col space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Checkout Equipment</h1>
                <p className="text-sm text-muted-foreground">Scan items to add them to your checkout list.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <Card className="p-4 sm:p-6" variant="glass">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                            <h3 className="font-semibold text-sm sm:text-base">Add Items</h3>
                            <Button
                                variant={showScanner ? 'secondary' : 'outline'}
                                size="sm"
                                onClick={() => setShowScanner(!showScanner)}
                                className="w-full sm:w-auto text-sm"
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
                                <div className="absolute z-50 w-full mt-2 bg-secondary border border-border rounded-lg shadow-2xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-200">
                                    {suggestions.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSuggestionClick(item)}
                                            className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border/50 last:border-0 flex items-center justify-between group"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-sm group-hover:text-primary transition-colors">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.barcode} • {item.category}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded group-hover:bg-background transition-colors">{item.location}</span>
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

                    <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-semibold">Cart ({cart.length})</h2>
                            {cart.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground hover:text-destructive text-xs sm:text-sm">
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {cart.length === 0 ? (
                            <div className="text-center py-8 sm:py-12 border-2 border-dashed border-border rounded-lg text-muted-foreground bg-muted/30">
                                <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p className="text-sm">No items in cart. Scan items to begin.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 sm:space-y-3">
                                {cart.map((item, index) => (
                                    <Card key={`${item.id}-${index}`} className="group hover:border-primary/50 transition-colors">
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold shrink-0 text-sm sm:text-base">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm sm:text-base truncate">{item.name}</h3>
                                                <p className="text-xs sm:text-sm text-muted-foreground truncate">{item.barcode} • {item.category}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 w-8 h-8 sm:w-9 sm:h-9"
                                                aria-label="Remove"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <Card title="Checkout Details" className="lg:sticky lg:top-20">
                        <div className="space-y-3 sm:space-y-4">
                            {user && ['MANAGER', 'ADMIN'].includes(user.role) && (
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Checkout For
                                    </label>
                                    <Select
                                        value={selectedUserId}
                                        onChange={setSelectedUserId}
                                        options={users.map(u => ({
                                            value: u.id,
                                            label: `${u.name} (${u.role})`
                                        }))}
                                    />
                                </div>
                            )}
                            <Input
                                label="Project / Shoot Name"
                                placeholder="e.g. Documentary Shoot A"
                                value={project}
                                onChange={(e) => setProject(e.target.value)}
                            />

                            <div className="pt-3 sm:pt-4 border-t border-border">
                                <div className="flex justify-between text-xs sm:text-sm mb-2">
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
