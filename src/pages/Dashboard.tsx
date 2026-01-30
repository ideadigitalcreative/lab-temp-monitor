import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { RoomCard } from '@/components/RoomCard';
import { EquipmentCard } from '@/components/EquipmentCard';
import { TemperatureChart } from '@/components/TemperatureChart';
import { StatCard } from '@/components/StatCard';
import { RoomFilter } from '@/components/RoomFilter';
import {
  useRooms,
  useRoomsWithLatestReadings,
  useTemperatureLogs,
} from '@/hooks/useRooms';
import {
  useEquipment,
  useEquipmentWithLatestReadings,
  useEquipmentTemperatureLogs,
} from '@/hooks/useEquipment';
import { useAllEquipmentWithLatestInspection } from '@/hooks/useEquipmentInspection';
import { InspectionSummaryChart } from '@/components/InspectionSummaryChart';
import {
  Thermometer,
  Droplets,
  Building2,
  AlertTriangle,
  Loader2,
  Box,
  ClipboardCheck,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'equipment'>('rooms');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: roomsWithReadings, isLoading: readingsLoading } = useRoomsWithLatestReadings();
  const { data: temperatureLogs, isLoading: logsLoading } = useTemperatureLogs(
    selectedRoom || undefined,
    dateRange?.from,
    dateRange?.to
  );

  const { data: equipment, isLoading: equipmentListLoading } = useEquipment();
  const { data: equipmentWithReadings, isLoading: equipmentReadingsLoading } = useEquipmentWithLatestReadings();
  const { data: equipmentLogs, isLoading: equipmentLogsLoading } = useEquipmentTemperatureLogs(
    selectedEquipment || undefined,
    dateRange?.from,
    dateRange?.to
  );
  const { data: equipmentInspection, isLoading: equipmentInspectionLoading } = useAllEquipmentWithLatestInspection();

  const isLoading = roomsLoading || readingsLoading || equipmentListLoading || equipmentReadingsLoading || equipmentInspectionLoading;

  const stats = useMemo(() => {
    const latestRooms = roomsWithReadings.filter((r) => r.latestReading);
    const latestEquip = equipmentWithReadings.filter((e) => e.latestReading && e.type === 'temperature');

    const temps = [
      ...latestRooms.map((r) => r.latestReading!.temperature),
      ...latestEquip.map((e) => e.latestReading!.temperature)
    ];

    const inspectionWarnings = equipmentInspection?.filter(ei => ei.latestInspection?.condition === 'tidak_bagus').length || 0;

    const warnings =
      roomsWithReadings.filter((r) => r.status === 'warning' || r.status === 'critical').length +
      equipmentWithReadings.filter((e) => e.type === 'temperature' && (e.status === 'warning' || e.status === 'critical')).length +
      inspectionWarnings;

    return {
      avgTemp: temps.length
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        : '-',
      totalAssets: roomsWithReadings.length + (equipment?.length || 0),
      warnings,
    };
  }, [roomsWithReadings, equipmentWithReadings, equipmentInspection, equipment]);

  const displayedRooms = selectedRoom
    ? roomsWithReadings.filter((r) => r.id === selectedRoom)
    : roomsWithReadings;

  const tempEquipment = useMemo(() => {
    const base = equipmentWithReadings.filter(e => e.type === 'temperature');
    return selectedEquipment ? base.filter(e => e.id === selectedEquipment) : base;
  }, [equipmentWithReadings, selectedEquipment]);

  const inspectionEquipment = useMemo(() => {
    const base = equipmentWithReadings.filter(e => e.type === 'inspection');
    return selectedEquipment ? base.filter(e => e.id === selectedEquipment) : base;
  }, [equipmentWithReadings, selectedEquipment]);

  const chartData = useMemo(() => {
    return (temperatureLogs || []).map((log) => ({
      id: log.id,
      roomId: log.room_id,
      roomName: log.rooms?.name,
      temperature: log.temperature,
      humidity: log.humidity,
      recordedAt: new Date(log.recorded_at),
    }));
  }, [temperatureLogs]);

  const equipmentChartData = useMemo(() => {
    return (equipmentLogs || []).map((log) => ({
      id: log.id,
      roomId: log.equipment_id,
      roomName: log.equipment?.name,
      temperature: log.temperature,
      recordedAt: new Date(log.recorded_at),
    }));
  }, [equipmentLogs]);


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Monitoring Lab & Equipment
          </h1>
          <p className="text-muted-foreground">
            Pemantauan suhu dan kelembaban real-time untuk ruangan dan perangkat laboratorium
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Memuat data...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Rata-rata Suhu"
                value={`${stats.avgTemp}°C`}
                icon={<Thermometer className="w-4 h-4 md:w-5 md:h-5" />}
                iconClassName="text-orange-500 bg-orange-500/10"
              />
              <StatCard
                title="Total Area & Alat"
                value={stats.totalAssets}
                icon={<Building2 className="w-4 h-4 md:w-5 md:h-5" />}
                iconClassName="text-violet-500 bg-violet-500/10"
              />
              <StatCard
                title="Perlu Perhatian"
                value={stats.warnings}
                icon={<AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />}
                className={stats.warnings > 0 ? 'border-status-warning' : ''}
                iconClassName={stats.warnings > 0 ? "text-orange-500 bg-orange-500/10" : "text-green-500 bg-green-500/10"}
              />
            </div>

            <Tabs defaultValue="rooms" className="w-full space-y-6" onValueChange={(v) => {
              setActiveTab(v as any);
              setSelectedEquipment(null);
              setSelectedRoom(null);
            }}>
              <div className="flex justify-center">
                <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-secondary/30 p-1 border border-border/50 rounded-xl backdrop-blur-sm h-12">
                  <TabsTrigger
                    value="rooms"
                    className="gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30"
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Monitoring</span> Ruangan
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipment_temp"
                    className="gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30"
                  >
                    <Thermometer className="w-4 h-4" />
                    Suhu Alat
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipment_inspection"
                    className="gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-600/30"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Pemeriksaan <span className="hidden sm:inline">Fisik</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="rooms" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Monitoring Ruangan</h2>
                </div>

                {/* Filters */}
                <div className="glass-card rounded-xl p-4">
                  <RoomFilter
                    rooms={rooms || []}
                    selectedRoom={selectedRoom}
                    dateRange={dateRange}
                    onRoomChange={setSelectedRoom}
                    onDateRangeChange={setDateRange}
                  />
                </div>

                {/* Chart Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Grafik Tren Ruangan</h3>
                  {chartData.length > 0 ? (
                    <TemperatureChart
                      data={chartData.slice(-50)}
                      sourceData={chartData}
                      title={
                        selectedRoom
                          ? `Visualisasi ${rooms?.find((r) => r.id === selectedRoom)?.name}`
                          : 'Grafik Suhu & Kelembaban (Semua Ruangan)'
                      }
                    />
                  ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                      <p>Belum ada data rekaman untuk periode ini</p>
                    </div>
                  )}
                </div>

                {/* Room Cards Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Kondisi Saat Ini</h3>
                  {displayedRooms.length > 0 ? (
                    <div
                      className={
                        displayedRooms.length === 7
                          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4"
                          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      }
                    >
                      {displayedRooms.map((room, index) => (
                        <div
                          key={room.id}
                          className={
                            displayedRooms.length === 7
                              ? (index < 3 ? "lg:col-span-4" : "lg:col-span-3")
                              : ""
                          }
                        >
                          <RoomCard
                            room={room}
                            onClick={() => setSelectedRoom(room.id)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada ruangan ditemukan
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="equipment_temp" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Monitoring Suhu Peralatan</h2>
                </div>

                {/* Filters */}
                <div className="glass-card rounded-xl p-4">
                  <RoomFilter
                    rooms={equipment?.filter(e => e.type === 'temperature').map(e => ({ ...e, location: e.location })) || []}
                    selectedRoom={selectedEquipment}
                    dateRange={dateRange}
                    onRoomChange={setSelectedEquipment}
                    onDateRangeChange={setDateRange}
                  />
                </div>

                {/* Temperature Chart Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Grafik Suhu Alat</h3>
                  {equipmentChartData.length > 0 ? (
                    <TemperatureChart
                      data={equipmentChartData.slice(-50)}
                      sourceData={equipmentChartData}
                      title={
                        selectedEquipment
                          ? `Grafik ${equipment?.find((e) => e.id === selectedEquipment)?.name}`
                          : 'Grafik Suhu Alat (Semua Alat)'
                      }
                    />
                  ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                      <p>Belum ada data suhu alat untuk periode ini</p>
                    </div>
                  )}
                </div>

                {/* List Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Daftar Alat Suhu</h3>
                  {tempEquipment.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tempEquipment.map((item) => (
                        <EquipmentCard
                          key={item.id}
                          equipment={item as any}
                          onClick={() => setSelectedEquipment(item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada alat suhu ditemukan
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="equipment_inspection" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Pemeriksaan Kondisi Alat</h2>
                </div>

                {/* Inspection Analysis Section */}
                {!selectedEquipment && equipmentInspection && equipmentInspection.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Analisis Kelayakan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InspectionSummaryChart
                        data={equipmentInspection}
                        className="md:col-span-1"
                      />
                      <div className="md:col-span-2 glass-card rounded-xl p-8 flex flex-col justify-center">
                        <div className="mb-4">
                          <h4 className="text-lg font-bold mb-2">Statistik Pemeriksaan Fisik</h4>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            Ringkasan ini memantau kelayakan fisik peralatan seperti BSC, LAF, dan Centrifuge berdasarkan pemeriksaan berkala (Bagus vs Tidak Bagus).
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Bagus</span>
                              <span className="text-[10px] text-muted-foreground">Layak Pakai</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Tidak Bagus</span>
                              <span className="text-[10px] text-muted-foreground">Perlu Atensi</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-500/5 border border-slate-500/10">
                            <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Belum Ada</span>
                              <span className="text-[10px] text-muted-foreground">Belum Update</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* List Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Daftar Alat Pemeriksaan</h3>
                  {inspectionEquipment.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {inspectionEquipment.map((item) => {
                        const inspectionInfo = equipmentInspection?.find(ei => ei.id === item.id);
                        return (
                          <EquipmentCard
                            key={item.id}
                            equipment={{
                              ...item,
                              latestInspection: inspectionInfo?.latestInspection
                            } as any}
                            onClick={() => setSelectedEquipment(item.id)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada alat pemeriksaan ditemukan
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>LabTemp Monitoring System © {new Date().getFullYear()}</p>
          <p className="text-xs mt-1">
            Dashboard publik untuk pemantauan suhu laboratorium
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
