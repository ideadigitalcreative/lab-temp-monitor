import { useState } from 'react';
import { Header } from '@/components/Header';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { TemperatureInputForm } from '@/components/TemperatureInputForm';
import { findRoomByBarcode, addTemperatureLog, mockRooms } from '@/data/mockData';
import { Room } from '@/types';
import { AlertCircle, ScanBarcode, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const ScanPage = () => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [inputMode, setInputMode] = useState<'scan' | 'manual'>('scan');

  const handleBarcodeScan = (barcode: string) => {
    setScanError(null);
    const room = findRoomByBarcode(barcode);

    if (room) {
      setSelectedRoom(room);
      toast.success(`Ruangan ${room.name} ditemukan!`);
    } else {
      setScanError(`Barcode "${barcode}" tidak ditemukan dalam sistem.`);
      toast.error('Barcode tidak dikenali');
    }
  };

  const handleManualBarcodeSubmit = () => {
    if (manualBarcode.trim()) {
      handleBarcodeScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const handleManualRoomSelect = (roomId: string) => {
    const room = mockRooms.find((r) => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      toast.success(`Ruangan ${room.name} dipilih!`);
    }
  };

  const handleSubmitTemperature = (data: { temperature: number; humidity: number }) => {
    if (selectedRoom) {
      addTemperatureLog(selectedRoom.id, data.temperature, data.humidity);
      toast.success('Data berhasil disimpan!');
    }
  };

  const handleReset = () => {
    setSelectedRoom(null);
    setScanError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Input Data Suhu</h1>
          <p className="text-muted-foreground text-sm">
            Scan barcode ruangan atau pilih secara manual
          </p>
        </div>

        {!selectedRoom ? (
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-lg">
              <Button
                variant={inputMode === 'scan' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => setInputMode('scan')}
              >
                <ScanBarcode className="w-4 h-4 mr-2" />
                Scan Barcode
              </Button>
              <Button
                variant={inputMode === 'manual' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => setInputMode('manual')}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Input Manual
              </Button>
            </div>

            {inputMode === 'scan' ? (
              <>
                {/* Barcode Scanner */}
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <ScanBarcode className="w-5 h-5 text-primary" />
                    Pindai Barcode
                  </h2>
                  <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onError={(error) => setScanError(error)}
                  />
                </div>

                {/* Manual Barcode Input */}
                <div className="glass-card rounded-xl p-5">
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">
                    Atau masukkan kode barcode secara manual:
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Contoh: LAB-MIKRO-001"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualBarcodeSubmit()}
                      className="font-mono"
                    />
                    <Button onClick={handleManualBarcodeSubmit}>Cari</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-card rounded-xl p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" />
                  Pilih Ruangan
                </h2>
                <Select onValueChange={handleManualRoomSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ruangan laboratorium..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mockRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex flex-col">
                          <span>{room.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {room.location}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Error Display */}
            {scanError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-status-critical-bg text-status-critical animate-slide-up">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Barcode Tidak Ditemukan</p>
                  <p className="text-sm opacity-80">{scanError}</p>
                </div>
              </div>
            )}

            {/* Available Barcodes Info */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <h4 className="font-medium text-sm mb-3">Kode Barcode Tersedia:</h4>
              <div className="flex flex-wrap gap-2">
                {mockRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleBarcodeScan(room.barcode)}
                    className="text-xs font-mono px-2 py-1 rounded bg-background hover:bg-accent transition-colors"
                  >
                    {room.barcode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <TemperatureInputForm
            room={selectedRoom}
            onSubmit={handleSubmitTemperature}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
};

export default ScanPage;
