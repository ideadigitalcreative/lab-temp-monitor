import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, StopCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanning = async () => {
    setError(null);
    
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // QR code not detected, keep scanning
        }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      const errorMessage = err?.message || 'Gagal mengakses kamera';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        id="barcode-reader"
        className={`relative overflow-hidden rounded-xl bg-secondary/50 ${
          isScanning ? 'min-h-[300px]' : 'min-h-[200px] flex items-center justify-center'
        }`}
      >
        {!isScanning && (
          <div className="text-center p-8">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">
              Klik tombol di bawah untuk mulai memindai barcode
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-status-critical-bg text-status-critical text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Button
        onClick={isScanning ? stopScanning : startScanning}
        variant={isScanning ? 'destructive' : 'default'}
        className="w-full"
        size="lg"
      >
        {isScanning ? (
          <>
            <StopCircle className="w-4 h-4 mr-2" />
            Hentikan Scan
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            Mulai Scan Barcode
          </>
        )}
      </Button>
    </div>
  );
}
