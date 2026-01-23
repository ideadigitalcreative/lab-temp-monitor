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

  const startScanning = async () => {
    setError(null);

    // Ensure the container is ready and any previous instances are cleared
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (e) {
          console.error("Error stopping previous scanner", e);
        }
      }
      scannerRef.current = null;
    }

    try {
      // Small delay to ensure the DOM has updated if we just toggled state
      setIsScanning(true);

      // Wait for the next frame to ensure the div with id "barcode-reader" is rendered/resized
      await new Promise(resolve => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            return {
              width: size,
              height: size
            };
          },
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
    } catch (err: any) {
      console.error("Scanner Error:", err);
      let errorMessage = 'Gagal mengakses kamera.';
      setIsScanning(false);

      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errorMessage = 'Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMessage = 'Tidak ada kamera ditemukan di perangkat ini.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        errorMessage = 'Kamera sedang digunakan oleh aplikasi lain atau mengalami error hardware.';
      } else if (err?.message?.includes('Camera streaming not supported')) {
        errorMessage = 'Browser ini tidak mendukung streaming kamera. Coba gunakan browser lain (Chrome/Safari) atau update browser Anda.';
      } else {
        errorMessage = err?.message || 'Gagal memulai scanner.';
      }

      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        setIsScanning(false);
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    } else {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <style>
        {`
          #barcode-reader video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 0.75rem;
          }
          #barcode-reader canvas {
            display: none;
          }
          #barcode-reader__scan_region {
            background: transparent !important;
          }
          #barcode-reader__dashboard {
            display: none !important;
          }
        `}
      </style>

      <div
        id="barcode-reader"
        className={`relative overflow-hidden rounded-xl bg-secondary/50 transition-all duration-300 ${isScanning ? 'min-h-[300px]' : 'min-h-[200px] flex items-center justify-center'
          }`}
      >
        {!isScanning && (
          <div className="text-center p-8 animate-fade-in">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm">
              Klik tombol di bawah untuk mulai memindai barcode
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-status-critical-bg text-status-critical text-sm animate-slide-up">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Button
        onClick={isScanning ? stopScanning : startScanning}
        variant={isScanning ? 'destructive' : 'default'}
        className="w-full shadow-button"
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

