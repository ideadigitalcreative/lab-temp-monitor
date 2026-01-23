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

    // Clear any existing scanner instance if needed
    if (scannerRef.current?.isScanning) {
      await stopScanning();
    }

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-reader');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }, // Use square aspect ratio often works better
          aspectRatio: 1.0,
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
      console.error("Scanner Error:", err);
      let errorMessage = 'Gagal mengakses kamera.';

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errorMessage = 'Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMessage = 'Tidak ada kamera ditemukan di perangkat ini.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMessage = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err?.message?.includes('Camera streaming not supported')) {
        errorMessage = 'Browser ini tidak mendukung streaming kamera. Coba gunakan browser lain (Chrome/Safari) atau update browser Anda.';
      }

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
        className={`relative overflow-hidden rounded-xl bg-secondary/50 ${isScanning ? 'min-h-[300px]' : 'min-h-[200px] flex items-center justify-center'
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
