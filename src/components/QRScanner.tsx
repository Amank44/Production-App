'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './Button';
import { Card } from './Card';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: string) => void;
    continuous?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, continuous = true }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string>('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isInitialized = useRef(false);
    const [scannerId] = useState(() => `qr-reader-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
    const lastScannedRef = useRef<{ text: string; time: number } | null>(null);

    const startScanning = async () => {
        if (!isSecureContext) {
            const errorMsg = 'Camera access requires HTTPS. Please use autocomplete or manual entry instead.';
            setError(errorMsg);
            if (onError) onError(errorMsg);
            return;
        }
        try {
            setError('');

            if (scannerRef.current && isInitialized.current) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch {
                    // Ignore cleanup errors
                }
            }

            const scanner = new Html5Qrcode(scannerId);
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    const now = Date.now();
                    if (lastScannedRef.current &&
                        lastScannedRef.current.text === decodedText &&
                        now - lastScannedRef.current.time < 2000) {
                        return;
                    }

                    lastScannedRef.current = { text: decodedText, time: now };
                    onScan(decodedText);

                    if (!continuous) {
                        stopScanning();
                    }
                },
                () => {
                    // Ignore continuous scanning errors
                }
            );

            setIsScanning(true);
            isInitialized.current = true;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to start camera';
            setError(errorMsg);
            if (onError) onError(errorMsg);
            console.error('QR Scanner Error:', err);
            scannerRef.current = null;
            isInitialized.current = false;
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isInitialized.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
                isInitialized.current = false;
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setIsScanning(false);
    };

    useEffect(() => {
        return () => {
            stopScanning();
        };
    }, []);

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold w-full sm:w-auto text-center sm:text-left">QR Code Scanner</h3>
                    {isScanning ? (
                        <Button variant="danger" onClick={stopScanning} size="sm" className="w-full sm:w-auto">
                            Stop Camera
                        </Button>
                    ) : (
                        <Button onClick={startScanning} size="sm" className="w-full sm:w-auto">
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Start Camera
                        </Button>
                    )}
                </div>

                <div
                    id={scannerId}
                    className={`w-full rounded-lg bg-muted ${isScanning ? 'block' : 'hidden'}`}
                    style={{
                        width: '100%',
                        minHeight: '300px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                />
                <style jsx global>{`
                    #${scannerId} video {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        display: block !important;
                        border-radius: 0.5rem;
                    }
                    #${scannerId} canvas {
                        display: none !important;
                    }
                `}</style>

                {!isScanning && !error && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <p className="text-sm">Click &quot;Start Camera&quot; to scan QR codes</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive font-medium">Camera Access Error</p>
                        <p className="text-xs text-destructive/80 mt-1">{error}</p>
                        <div className="mt-3 p-3 bg-card rounded border border-border">
                            <p className="text-xs font-medium mb-2">Common Solutions:</p>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Grant camera permissions when prompted</li>
                                <li>Use Chrome or Safari browser</li>
                                <li>Camera requires HTTPS on mobile devices</li>
                                <li>Try using manual entry or autocomplete instead</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

// Mobile-optimized immersive scanner component with auto-start and camera refresh
interface MobileScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: string) => void;
    onClose?: () => void;
    autoStart?: boolean;
}

export const MobileScanner: React.FC<MobileScannerProps> = ({
    onScan,
    onError,
    onClose,
    autoStart = true
}) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string>('');
    const [scanCount, setScanCount] = useState(0);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isInitialized = useRef(false);
    const [scannerId] = useState(() => `mobile-qr-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
    const lastScannedRef = useRef<{ text: string; time: number } | null>(null);

    const startScanning = async () => {
        if (!isSecureContext) {
            const errorMsg = 'Camera access requires HTTPS.';
            setError(errorMsg);
            if (onError) onError(errorMsg);
            return;
        }

        try {
            setError('');

            if (scannerRef.current && isInitialized.current) {
                try {
                    await scannerRef.current.stop();
                    scannerRef.current.clear();
                } catch {
                    // Ignore cleanup errors
                }
            }

            const scanner = new Html5Qrcode(scannerId);
            scannerRef.current = scanner;

            const config = {
                fps: 15,
                qrbox: { width: 280, height: 280 },
                aspectRatio: 1.0,
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                async (decodedText) => {
                    const now = Date.now();
                    if (lastScannedRef.current &&
                        lastScannedRef.current.text === decodedText &&
                        now - lastScannedRef.current.time < 1500) {
                        return;
                    }

                    lastScannedRef.current = { text: decodedText, time: now };
                    setScanCount(prev => prev + 1);
                    onScan(decodedText);

                    // Brief pause then refresh camera for fresh data
                    try {
                        await scanner.pause(true);
                        setTimeout(async () => {
                            try {
                                await scanner.resume();
                            } catch {
                                // If resume fails, restart
                                refreshCamera();
                            }
                        }, 300);
                    } catch {
                        // Ignore pause errors
                    }
                },
                () => { }
            );

            setIsScanning(true);
            isInitialized.current = true;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to start camera';
            setError(errorMsg);
            if (onError) onError(errorMsg);
            console.error('Mobile Scanner Error:', err);
            scannerRef.current = null;
            isInitialized.current = false;
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && isInitialized.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
                scannerRef.current = null;
                isInitialized.current = false;
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
        }
        setIsScanning(false);
    };

    const refreshCamera = async () => {
        await stopScanning();
        setTimeout(() => {
            startScanning();
        }, 100);
    };

    // Auto-start on mount
    useEffect(() => {
        if (autoStart) {
            const timer = setTimeout(() => {
                startScanning();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [autoStart]);

    useEffect(() => {
        return () => {
            stopScanning();
        };
    }, []);

    return (
        <div className="relative bg-black rounded-t-3xl overflow-hidden">
            {/* Scanner container */}
            <div
                id={scannerId}
                className="w-full"
                style={{
                    width: '100%',
                    height: '320px',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            />

            {/* Scan overlay with corners */}
            {isScanning && (
                <div className="absolute inset-0 pointer-events-none" style={{ top: 0, height: '320px' }}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px]">
                        <div className="absolute top-0 left-0 w-10 h-10 border-white rounded-tl-2xl" style={{ borderWidth: '4px 0 0 4px' }} />
                        <div className="absolute top-0 right-0 w-10 h-10 border-white rounded-tr-2xl" style={{ borderWidth: '4px 4px 0 0' }} />
                        <div className="absolute bottom-0 left-0 w-10 h-10 border-white rounded-bl-2xl" style={{ borderWidth: '0 0 4px 4px' }} />
                        <div className="absolute bottom-0 right-0 w-10 h-10 border-white rounded-br-2xl" style={{ borderWidth: '0 4px 4px 0' }} />
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0071e3] to-transparent animate-scan-line rounded-full" />
                    </div>
                </div>
            )}

            {/* Scan count indicator */}
            {scanCount > 0 && (
                <div className="absolute top-5 left-5 px-4 py-2 bg-[#34c759] rounded-full shadow-lg">
                    <span className="text-white text-[14px] font-bold">{scanCount} scanned</span>
                </div>
            )}

            {/* Close button */}
            {onClose && (
                <button
                    onClick={() => {
                        stopScanning();
                        onClose();
                    }}
                    className="absolute top-5 right-5 w-11 h-11 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Loading state */}
            {!isScanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black" style={{ height: '320px' }}>
                    <div className="text-center">
                        <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
                        <p className="text-white/80 text-[17px] font-medium">Starting camera...</p>
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/95 p-8" style={{ height: '320px' }}>
                    <div className="text-center">
                        <div className="w-20 h-20 bg-[#ff3b30]/20 rounded-full flex items-center justify-center mx-auto mb-5">
                            <svg className="w-10 h-10 text-[#ff3b30]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-white text-[20px] font-bold mb-2">Camera Error</p>
                        <p className="text-white/50 text-[15px] mb-6">{error}</p>
                        <button
                            onClick={startScanning}
                            className="px-8 py-3.5 bg-[#0071e3] text-white rounded-2xl text-[17px] font-semibold active:scale-95 transition-transform"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom hint */}
            <div className="bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 left-0 right-0 px-6 py-5 text-center">
                <p className="text-white/70 text-[15px] font-medium">
                    {isScanning ? 'Align QR code within the frame' : 'Initializing...'}
                </p>
            </div>

            <style jsx global>{`
                #${scannerId} video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    display: block !important;
                }
                #${scannerId} canvas {
                    display: none !important;
                }
                @keyframes scan-line {
                    0% { top: 0; opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { top: calc(100% - 4px); opacity: 1; }
                }
                .animate-scan-line {
                    animation: scan-line 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
