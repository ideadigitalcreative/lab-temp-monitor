import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { TemperatureInputForm } from '@/components/TemperatureInputForm';
import { useRooms, useRoomByBarcode, useAddTemperatureLog, Room } from '@/hooks/useRooms';
import {
  useEquipment,
  useEquipmentByBarcode,
  useAddEquipmentTemperatureLog,
  Equipment
} from '@/hooks/useEquipment';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, ScanBarcode, Keyboard, LogIn, Box, Building2 } from 'lucide-react';
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
import { Link } from 'react-router-dom';

const ScanPage = () => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searchBarcode, setSearchBarcode] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'scan' | 'manual'>('scan');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedAsset, setConfirmedAsset] = useState<{ type: 'room' | 'equipment', data: Room | Equipment } | null>(null);

  const [searchParams] = useSearchParams();
  const urlRoomId = searchParams.get('roomId');
  const urlEquipId = searchParams.get('equipmentId');

  const { user, loading: authLoading } = useAuth();
  const { data: rooms } = useRooms();
  const { data: equipment } = useEquipment();

  const { data: foundRoom, isLoading: searchingRoom } = useRoomByBarcode(searchBarcode);
  const { data: foundEquip, isLoading: searchingEquip } = useEquipmentByBarcode(searchBarcode);

  const addTemperatureLog = useAddTemperatureLog();
  const addEquipmentLog = useAddEquipmentTemperatureLog();

  // Auto-select room from URL
  useEffect(() => {
    if (urlRoomId && rooms && !selectedRoom) {
      const room = rooms.find((r) => r.id === urlRoomId);
      if (room) {
        setSelectedRoom(room);
        toast.success(`Ruangan ${room.name} dipilih dari link!`);
      }
    }
    if (urlEquipId && equipment && !selectedEquipment) {
      const equip = equipment.find((e) => e.id === urlEquipId);
      if (equip) {
        setSelectedEquipment(equip);
        toast.success(`Alat ${equip.name} dipilih dari link!`);
      }
    }
  }, [urlRoomId, urlEquipId, rooms, equipment, selectedRoom, selectedEquipment]);

  // Handle barcode search result
  useEffect(() => {
    if (isConfirming) return;

    if (foundRoom && !selectedRoom) {
      setConfirmedAsset({ type: 'room', data: foundRoom });
      setIsConfirming(true);
      setSearchBarcode(null);

      const timer = setTimeout(() => {
        setSelectedRoom(foundRoom);
        setIsConfirming(false);
        setConfirmedAsset(null);
        toast.success(`Ruangan ${foundRoom.name} terdeteksi!`);
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (foundEquip && !selectedEquipment) {
      setConfirmedAsset({ type: 'equipment', data: foundEquip });
      setIsConfirming(true);
      setSearchBarcode(null);

      const timer = setTimeout(() => {
        setSelectedEquipment(foundEquip);
        setIsConfirming(false);
        setConfirmedAsset(null);
        toast.success(`Alat ${foundEquip.name} terdeteksi!`);
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (searchBarcode && !searchingRoom && !searchingEquip && !foundRoom && !foundEquip && !selectedRoom && !selectedEquipment) {
      setScanError(`Barcode "${searchBarcode}" tidak ditemukan dalam sistem.`);
      setSearchBarcode(null);
      toast.error('Barcode tidak dikenali');
    }
  }, [foundRoom, foundEquip, selectedRoom, selectedEquipment, searchBarcode, searchingRoom, searchingEquip, isConfirming]);

  const handleBarcodeScan = (barcode: string) => {
    setScanError(null);

    // Check if the scanned barcode is a URL from our system
    if (barcode.includes('roomId=')) {
      try {
        const url = new URL(barcode);
        const roomId = url.searchParams.get('roomId');
        if (roomId) {
          const room = rooms?.find(r => r.id === roomId);
          if (room) {
            setConfirmedAsset({ type: 'room', data: room });
            setIsConfirming(true);
            setTimeout(() => {
              setSelectedRoom(room);
              setIsConfirming(false);
              setConfirmedAsset(null);
              toast.success(`Ruangan ${room.name} ditemukan dari QR Link!`);
            }, 1000);
            return;
          }
        }
      } catch (e) {
        console.error("Scanned text is not a valid URL, treating as barcode");
      }
    }

    if (barcode.includes('equipmentId=')) {
      try {
        const url = new URL(barcode);
        const equipId = url.searchParams.get('equipmentId');
        if (equipId) {
          const equip = equipment?.find(e => e.id === equipId);
          if (equip) {
            setConfirmedAsset({ type: 'equipment', data: equip });
            setIsConfirming(true);
            setTimeout(() => {
              setSelectedEquipment(equip);
              setIsConfirming(false);
              setConfirmedAsset(null);
              toast.success(`Alat ${equip.name} ditemukan dari QR Link!`);
            }, 1000);
            return;
          }
        }
      } catch (e) {
        console.error("Scanned text is not a valid URL, treating as barcode");
      }
    }

    setSearchBarcode(barcode);
  };

  const handleManualRoomSelect = (roomId: string) => {
    const room = rooms?.find((r) => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      toast.success(`Ruangan ${room.name} dipilih!`);
    }
  };

  const handleManualEquipSelect = (equipId: string) => {
    const equip = equipment?.find((e) => e.id === equipId);
    if (equip) {
      setSelectedEquipment(equip);
      toast.success(`Alat ${equip.name} dipilih!`);
    }
  };

  const handleSubmitTemperature = async (data: { temperature: number; humidity: number }) => {
    if (selectedRoom) {
      try {
        await addTemperatureLog.mutateAsync({
          roomId: selectedRoom.id,
          temperature: data.temperature,
          humidity: data.humidity,
        });
        toast.success('Data berhasil disimpan!');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menyimpan data');
      }
    } else if (selectedEquipment) {
      try {
        await addEquipmentLog.mutateAsync({
          equipmentId: selectedEquipment.id,
          temperature: data.temperature,
        });
        toast.success('Data alat berhasil disimpan!');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menyimpan data alat');
      }
    }
  };

  const handleReset = () => {
    setSelectedRoom(null);
    setSelectedEquipment(null);
    setScanError(null);
    setSearchBarcode(null);
  };

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-6 max-w-lg mx-auto">
          <div className="glass-card rounded-xl p-8 text-center animate-slide-up">
            <LogIn className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Login Diperlukan</h2>
            <p className="text-muted-foreground mb-6">
              Anda harus login terlebih dahulu untuk mencatat data suhu.
            </p>
            <Link to="/auth">
              <Button size="lg" className="w-full">
                Masuk ke Akun
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Input Data Suhu</h1>
          <p className="text-muted-foreground text-sm">
            Scan barcode atau pilih secara manual (Ruangan / Alat)
          </p>
        </div>

        {isConfirming && confirmedAsset ? (
          <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center text-center animate-fade-in border-primary/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                {confirmedAsset.type === 'room' ? (
                  <Building2 className="w-8 h-8 text-primary animate-bounce" />
                ) : (
                  <Box className="w-8 h-8 text-primary animate-bounce" />
                )}
              </div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {confirmedAsset.type === 'room' ? 'Ruangan' : 'Alat'} Terdeteksi
              </h2>
              <p className="text-2xl font-bold text-foreground mb-4">{confirmedAsset.data.name}</p>
              <div className="flex items-center gap-2 text-primary font-medium animate-pulse">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>Mengarahkan ke input data...</span>
              </div>
            </div>
          </div>
        ) : !selectedRoom && !selectedEquipment ? (
          <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-secondary rounded-lg">
              <Button
                variant={inputMode === 'scan' ? 'default' : 'ghost'}
                className="flex-1"
                onClick={() => setInputMode('scan')}
              >
                <ScanBarcode className="w-4 h-4 mr-2" />
                Scan QR/Barcode
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
              <div className="glass-card rounded-xl p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <ScanBarcode className="w-5 h-5 text-primary" />
                  Pindai QR Kode
                </h2>
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onError={(error) => setScanError(error)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Room Manual Select */}
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Pilih Ruangan
                  </h2>
                  <Select onValueChange={handleManualRoomSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih ruangan laboratorium..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map((room) => (
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

                {/* Equipment Manual Select */}
                <div className="glass-card rounded-xl p-5">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Box className="w-5 h-5 text-primary" />
                    Pilih Alat
                  </h2>
                  <Select onValueChange={handleManualEquipSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih alat laboratorium..." />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex flex-col">
                            <span>{item.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.location}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Error Display */}
            {scanError && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-status-critical-bg text-status-critical animate-slide-up">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error Pemberitahuan</p>
                  <p className="text-sm opacity-80">{scanError}</p>
                </div>
              </div>
            )}

            {/* Available Barcodes Info */}
            <div className="bg-secondary/50 rounded-xl p-4">
              <h4 className="font-medium text-sm mb-3">Kode Tersedia:</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Ruangan:</p>
                  <div className="flex flex-wrap gap-2">
                    {rooms?.map((room) => (
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
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Alat:</p>
                  <div className="flex flex-wrap gap-2">
                    {equipment?.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleBarcodeScan(item.barcode)}
                        className="text-xs font-mono px-2 py-1 rounded bg-background hover:bg-accent transition-colors"
                      >
                        {item.barcode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <TemperatureInputForm
            key={selectedRoom?.id || selectedEquipment?.id}
            room={selectedRoom || selectedEquipment!}
            onSubmit={handleSubmitTemperature}
            onReset={handleReset}
            isSubmitting={addTemperatureLog.isPending || addEquipmentLog.isPending}
            showHumidity={!!selectedRoom}
          />
        )}
      </main>
    </div>
  );
};

export default ScanPage;
