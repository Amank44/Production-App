'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/storage';
import { Equipment, Transaction, User } from '@/types';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Select } from '@/components/Select';
import { QRScanner, MobileScanner } from '@/components/QRScanner';
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
        // Using a simple oscillator beep for success
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 - high pitch for success
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);

        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    };

    const playErrorSound = () => {
        // Using a lower, harsher tone for error
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square'; // Square wave sounds harsher
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 - low pitch for error
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.2); // Slightly longer

        // Double vibrate for error
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
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
            playErrorSound();
            lastProcessedRef.current = { code: normalizedBarcode, time: now };
            return;
        }

        if (found.status !== 'AVAILABLE') {
            const statusMessage = found.status === 'CHECKED_OUT'
                ? 'checked out'
                : found.status === 'MAINTENANCE'
                    ? 'under maintenance'
                    : found.status.toLowerCase().replace('_', ' ');
            setError(`Item "${found.name}" is currently ${statusMessage}`);
            playErrorSound();
            lastProcessedRef.current = { code: normalizedBarcode, time: now };
            return;
        }

        // Check against current state (might be stale in rapid succession)
        if (cart.find(i => i.id === found.id)) {
            setError(`Item "${found.name}" is already in cart`);
            playErrorSound();
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

    // Mobile-optimized native app layout
    return (
        <>
            {/* Desktop Layout - Hidden on Mobile */}
            <div className="hidden md:block max-w-4xl mx-auto space-y-8 pb-20">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Checkout Equipment</h1>
                    <p className="text-sm text-muted-foreground">Scan items to add them to your checkout list.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-6" variant="glass">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <h3 className="font-semibold">Add Items</h3>
                                <Button
                                    variant={showScanner ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={() => setShowScanner(!showScanner)}
                                >
                                    {showScanner ? 'Hide Scanner' : 'Use Camera'}
                                </Button>
                            </div>

                            {(error || successMessage) && (
                                <div className="mb-4">
                                    {error && (
                                        <div className="p-3 bg-[#ff3b30]/10 border border-[#ff3b30]/20 rounded-xl flex items-center animate-fade-in">
                                            <div className="w-8 h-8 rounded-full bg-[#ff3b30]/20 flex items-center justify-center mr-3 flex-shrink-0">
                                                <svg className="w-4 h-4 text-[#ff3b30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                            <p className="text-[14px] text-[#ff3b30] font-medium">{error}</p>
                                        </div>
                                    )}
                                    {successMessage && (
                                        <div className="p-3 bg-[#34c759]/10 border border-[#34c759]/20 rounded-xl flex items-center animate-fade-in">
                                            <div className="w-8 h-8 rounded-full bg-[#34c759]/20 flex items-center justify-center mr-3 flex-shrink-0">
                                                <svg className="w-4 h-4 text-[#34c759]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <p className="text-[14px] text-[#34c759] font-medium">{successMessage}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {showScanner && (
                                <div className="mb-6 animate-accordion-down">
                                    <QRScanner
                                        onScan={handleQRScan}
                                        onError={(err) => { setError(err); playErrorSound(); }}
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
                                    <p className="text-sm">No items in cart. Scan items to begin.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item, index) => (
                                        <Card key={`${item.id}-${index}`} className="group hover:border-primary/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium truncate">{item.name}</h3>
                                                    <p className="text-sm text-muted-foreground truncate">{item.barcode} • {item.category}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                    aria-label="Remove"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
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

                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 card-apple lg:sticky lg:top-20">
                            <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-5">Checkout Details</h3>

                            <div className="space-y-4">
                                {user && ['MANAGER', 'ADMIN'].includes(user.role) && (
                                    <Select
                                        label="Checkout For"
                                        value={selectedUserId}
                                        onChange={setSelectedUserId}
                                        options={users.map(u => ({
                                            value: u.id,
                                            label: `${u.name} (${u.role})`
                                        }))}
                                    />
                                )}

                                <div className="space-y-2">
                                    <label className="text-[13px] font-medium text-[#86868b]">
                                        Project / Shoot Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Documentary Shoot A"
                                        value={project}
                                        onChange={(e) => setProject(e.target.value)}
                                        className="w-full h-11 px-4 bg-[#f5f5f7] border-0 rounded-xl text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                                    />
                                </div>

                                <div className="pt-4 mt-4 border-t border-[#f5f5f7]">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[15px] text-[#86868b]">Total Items</span>
                                        <span className="text-[20px] font-semibold text-[#1d1d1f]">{cart.length}</span>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={cart.length === 0 || isLoading}
                                        className="w-full h-12 bg-[#0071e3] text-white rounded-xl text-[15px] font-medium hover:bg-[#0077ed] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        Confirm Checkout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Native App Layout - Premium Apple Style */}
            <div className="md:hidden flex flex-col min-h-[calc(100vh-120px)] -mx-4 sm:-mx-6">
                {/* Floating Feedback Toast - Fixed at top with glassmorphism */}
                {(error || successMessage) && (
                    <div className="fixed top-14 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
                        {error && (
                            <div className="p-4 bg-gradient-to-r from-[#ff3b30] to-[#ff453a] rounded-2xl flex items-center shadow-2xl shadow-[#ff3b30]/30 backdrop-blur-xl">
                                <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center mr-3.5 flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                                <p className="text-[16px] text-white font-semibold flex-1 leading-tight">{error}</p>
                            </div>
                        )}
                        {successMessage && (
                            <div className="p-4 bg-gradient-to-r from-[#30d158] to-[#34c759] rounded-2xl flex items-center shadow-2xl shadow-[#34c759]/30 backdrop-blur-xl">
                                <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center mr-3.5 flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="text-[16px] text-white font-semibold flex-1 leading-tight">{successMessage}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Scanner Section - Immersive with MobileScanner (auto-starts camera) */}
                {showScanner && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <MobileScanner
                            onScan={handleQRScan}
                            onError={(err) => { setError(err); playErrorSound(); }}
                            onClose={() => setShowScanner(false)}
                            autoStart={true}
                        />
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto pb-52">
                    {/* Search/Manual Input Section - Fixed padding for no overlap */}
                    <div className="px-5 pt-5 pb-4">
                        <form onSubmit={handleScan} className="relative">
                            <div className="flex gap-3">
                                <div className="flex-1 relative group">
                                    {/* Search Icon - positioned with proper spacing */}
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                        </svg>
                                    </div>
                                    {/* Search Input with proper padding */}
                                    <input
                                        placeholder="Search..."
                                        value={scanInput}
                                        onChange={(e) => handleInputChange(e.target.value)}
                                        onFocus={() => scanInput && setShowSuggestions(suggestions.length > 0)}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        className="w-full h-[52px] pl-12 pr-4 bg-[#f2f2f7] border-0 rounded-2xl text-[17px] text-[#1d1d1f] placeholder:text-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:bg-white transition-all shadow-sm"
                                    />
                                </div>
                                {/* Scan Button - Always visible, premium style */}
                                <button
                                    type="button"
                                    onClick={() => setShowScanner(true)}
                                    className="h-[52px] w-[52px] bg-gradient-to-b from-[#0077ed] to-[#0071e3] rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-[#0071e3]/30"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Suggestions Dropdown - Premium styling */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-[#e5e5ea]/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {suggestions.map((item, idx) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSuggestionClick(item)}
                                            className={`w-full px-4 py-4 text-left active:bg-[#f2f2f7] transition-colors flex items-center gap-4 ${idx !== suggestions.length - 1 ? 'border-b border-[#e5e5ea]/50' : ''}`}
                                        >
                                            <div className="w-11 h-11 bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <svg className="w-5 h-5 text-[#636366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[16px] font-semibold text-[#1d1d1f] truncate">{item.name}</p>
                                                <p className="text-[14px] text-[#8e8e93] truncate">{item.barcode} • {item.category}</p>
                                            </div>
                                            <div className="w-7 h-7 bg-[#0071e3] rounded-full flex items-center justify-center flex-shrink-0">
                                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Cart Section - Premium iOS Grouped Style */}
                    <div className="mt-3">
                        {/* Section Header */}
                        <div className="flex items-center justify-between px-5 py-2.5">
                            <h2 className="text-[13px] font-bold text-[#8e8e93] uppercase tracking-[0.5px]">
                                Cart • {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
                            </h2>
                            {cart.length > 0 && (
                                <button
                                    onClick={() => setCart([])}
                                    className="text-[15px] text-[#ff3b30] font-semibold active:opacity-50 transition-opacity"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>

                        {/* Cart Items - Premium List Style */}
                        {cart.length === 0 ? (
                            <div className="mx-5 bg-white rounded-3xl shadow-sm border border-[#e5e5ea]/30">
                                <div className="py-20 text-center px-8">
                                    <div className="w-24 h-24 mx-auto mb-5 bg-gradient-to-br from-[#f5f5f7] to-[#e8e8ed] rounded-full flex items-center justify-center shadow-inner">
                                        <svg className="w-12 h-12 text-[#c7c7cc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-[20px] font-bold text-[#1d1d1f] mb-2">Your Cart is Empty</p>
                                    <p className="text-[15px] text-[#8e8e93] leading-relaxed">Tap the camera button to scan equipment or search by name</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mx-5 bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e5e5ea]/30">
                                {cart.map((item, index) => (
                                    <div
                                        key={`${item.id}-${index}`}
                                        className={`flex items-center gap-4 px-4 py-4 active:bg-[#f2f2f7] transition-colors ${index !== cart.length - 1 ? 'border-b border-[#e5e5ea]/50' : ''}`}
                                    >
                                        {/* Item Number Badge */}
                                        <div className="w-10 h-10 bg-gradient-to-b from-[#0077ed] to-[#0071e3] rounded-xl flex items-center justify-center text-white font-bold text-[15px] flex-shrink-0 shadow-md shadow-[#0071e3]/20">
                                            {index + 1}
                                        </div>

                                        {/* Item Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[16px] font-semibold text-[#1d1d1f] truncate">{item.name}</p>
                                            <p className="text-[14px] text-[#8e8e93] truncate">{item.barcode}</p>
                                        </div>

                                        {/* Category Badge */}
                                        <span className="text-[12px] font-semibold text-[#636366] bg-[#f2f2f7] px-2.5 py-1 rounded-lg flex-shrink-0">
                                            {item.category}
                                        </span>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="w-9 h-9 flex items-center justify-center text-[#ff3b30] active:opacity-50 active:scale-90 transition-all flex-shrink-0"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Project Input Section - Premium styling */}
                    <div className="mt-8 px-5">
                        <p className="text-[13px] font-bold text-[#8e8e93] uppercase tracking-[0.5px] mb-3 px-1">
                            Project Details
                        </p>
                        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e5e5ea]/30">
                            {user && ['MANAGER', 'ADMIN'].includes(user.role) && (
                                <div className="px-4 py-4 border-b border-[#e5e5ea]/50">
                                    <Select
                                        label="Checkout For"
                                        value={selectedUserId}
                                        onChange={setSelectedUserId}
                                        options={users.map(u => ({
                                            value: u.id,
                                            label: `${u.name} (${u.role})`
                                        }))}
                                    />
                                </div>
                            )}
                            <div className="px-4 py-4">
                                <label className="text-[13px] font-semibold text-[#8e8e93] mb-2 block">Project / Shoot Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Documentary Shoot A"
                                    value={project}
                                    onChange={(e) => setProject(e.target.value)}
                                    className="w-full h-12 px-4 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-[#1d1d1f] placeholder:text-[#c7c7cc] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/50 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Bottom Checkout Bar - Premium Glassmorphism */}
                <div className="fixed bottom-16 left-0 right-0 z-40 bg-white/80 backdrop-blur-2xl border-t border-[#e5e5ea]/50 px-5 py-4 safe-area-bottom shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-5">
                        {/* Cart Summary */}
                        <div className="flex-shrink-0">
                            <p className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">Total</p>
                            <p className="text-[28px] font-bold text-[#1d1d1f] leading-none mt-0.5">{cart.length}</p>
                        </div>

                        {/* Checkout Button - Premium gradient */}
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || isLoading}
                            className="flex-1 h-[56px] bg-gradient-to-b from-[#0077ed] to-[#0071e3] text-white rounded-2xl text-[18px] font-bold active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-xl shadow-[#0071e3]/25"
                        >
                            {isLoading ? (
                                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Confirm Checkout
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
