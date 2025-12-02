'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './Button';
import { Card } from './Card';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onError?: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string>('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isInitialized = useRef(false);
    const [scannerId] = useState(() => `qr-reader-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

    const startScanning = async () => {
        // Check if we're in a secure context (HTTPS or localhost)
        if (!isSecureContext) {
            const errorMsg = 'Camera access requires HTTPS. Please use autocomplete or manual entry instead.';
            setError(errorMsg);
            if (onError) onError(errorMsg);
            return;
        }
        try {
            setError('');

            // Clean up any existing scanner first
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
                    onScan(decodedText);
                    stopScanning();
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
            // Reset state on error
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
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">QR Code Scanner</h3>
                    {isScanning ? (
                        <Button variant="danger" onClick={stopScanning} size="sm">
                            Stop Camera
                        </Button>
                    ) : (
                        <Button onClick={startScanning} size="sm">
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
                    className={`w-full overflow-hidden rounded-lg bg-black ${isScanning ? 'block' : 'hidden'}`}
                    style={{
                        width: '100%',
                        minHeight: '300px'
                    }}
                />

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
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                💡 <strong>Tip:</strong> Use the autocomplete feature below - just start typing the equipment name or barcode!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
