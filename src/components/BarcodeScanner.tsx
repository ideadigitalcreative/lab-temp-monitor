import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, StopCircle, AlertCircle, Zap, ZapOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const beepRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Hidden audio element for beep
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFRm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT18AAAAA"); // Very short beep placeholder, or better use a synthesized one
    // Synthesizing a beep
    const oscillator = (context: AudioContext) => {
      const g = context.createGain();
      const o = context.createOscillator();
      o.connect(g);
      g.connect(context.destination);
      o.start(0);
      g.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.1);
      o.stop(context.currentTime + 0.1);
    };
    (window as any).playScanBeep = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext();
        oscillator(context);
      } catch (e) {
        console.warn("Audio feedback failed", e);
      }
    };
  }, []);

  const playSuccessFeedback = () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
    // Audio feedback
    if ((window as any).playScanBeep) {
      (window as any).playScanBeep();
    }
  };

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
          playSuccessFeedback();
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // QR code not detected, keep scanning
        }
      ).then(() => {
        // Check if torch is supported
        const state = scanner.getRunningTrackCapabilities();
        if (state && (state as any).torch) {
          setHasTorch(true);
        }
      });
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

  const toggleTorch = async () => {
    if (scannerRef.current && hasTorch) {
      try {
        const newTorchState = !isTorchOn;
        await (scannerRef.current as any).applyVideoConstraints({
          advanced: [{ torch: newTorchState }]
        });
        setIsTorchOn(newTorchState);
      } catch (err) {
        console.error('Error toggling torch:', err);
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        setIsScanning(false);
        setIsTorchOn(false);
        setHasTorch(false);
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
        className={`relative overflow-hidden rounded-xl bg-secondary/50 transition-all duration-300 ${isScanning || error ? 'min-h-[300px]' : 'min-h-[200px] flex items-center justify-center'
          }`}
      >
        {!isScanning && !error && (
          <div className="text-center p-8 animate-fade-in">
            <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-sm">
              Klik tombol di bawah untuk mulai memindai barcode
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-status-critical-bg/20 backdrop-blur-[2px]">
            <div className="bg-white/90 dark:bg-black/40 p-6 rounded-2xl shadow-lg border border-status-critical/20 max-w-[280px]">
              <AlertCircle className="w-10 h-10 mx-auto text-status-critical mb-4" />
              <h3 className="font-semibold text-status-critical mb-2">Akses Kamera Gagal</h3>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={startScanning}
                className="w-full border-status-critical/30 hover:bg-status-critical/10"
              >
                Coba Lagi
              </Button>
            </div>
          </div>
        )}

        {isScanning && !error && (
          <>
            {/* Scanning Laser Animation */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className="w-full h-[2px] bg-primary/60 shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-[scan-line_2s_ease-in-out_infinite]" />
              {/* Viewfinder corners */}
              <div className="absolute w-[70%] h-[70%] border-2 border-primary/20 rounded-lg">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-md" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-md" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-md" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-md" />
              </div>
            </div>

            {/* Torch Toggle Button */}
            {hasTorch && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-20 rounded-full bg-black/40 hover:bg-black/60 text-white border-none backdrop-blur-md"
                onClick={toggleTorch}
              >
                {isTorchOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </Button>
            )}
          </>
        )}
      </div>

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

