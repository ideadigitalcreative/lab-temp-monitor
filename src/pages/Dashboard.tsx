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
    const latestEquip = equipmentWithReadings.filter((e) => e.latestReading);

    const temps = [
      ...latestRooms.map((r) => r.latestReading!.temperature),
      ...latestEquip.map((e) => e.latestReading!.temperature)
    ];

    const inspectionWarnings = equipmentInspection?.filter(ei => ei.latestInspection?.condition === 'tidak_bagus').length || 0;

    const warnings =
      roomsWithReadings.filter((r) => r.status === 'warning' || r.status === 'critical').length +
      equipmentWithReadings.filter((e) => e.status === 'warning' || e.status === 'critical').length +
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

  const displayedEquipment = selectedEquipment
    ? equipmentWithReadings.filter((e) => e.id === selectedEquipment)
    : equipmentWithReadings;

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

            <Tabs defaultValue="rooms" className="w-full space-y-6" onValueChange={(v) => setActiveTab(v as any)}>
              <div className="flex justify-center">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="rooms" className="gap-2">
                    <Building2 className="w-4 h-4" />
                    Ruangan
                  </TabsTrigger>
                  <TabsTrigger value="equipment" className="gap-2">
                    <Box className="w-4 h-4" />
                    Alat
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

              <TabsContent value="equipment" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                    <Box className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Monitoring Peralatan</h2>
                </div>

                {/* Filters */}
                <div className="glass-card rounded-xl p-4">
                  <RoomFilter
                    rooms={equipment?.map(e => ({ ...e, location: e.location })) || []}
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

                {/* Inspection Analysis Section */}
                {!selectedEquipment && equipmentInspection && equipmentInspection.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Analisis Kondisi Fisik</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <InspectionSummaryChart
                        data={equipmentInspection}
                        className="md:col-span-1"
                      />
                      <div className="md:col-span-2 glass-card rounded-xl p-8 flex flex-col justify-center">
                        <div className="mb-4">
                          <h4 className="text-lg font-bold mb-2">Kesehatan Aset Laboratorium</h4>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            Ringkasan ini memantau kelayakan fisik peralatan berdasarkan pemeriksaan berkala (Bagus vs Tidak Bagus).
                            Alat dengan status <strong>"Belum Diperiksa"</strong> memerlukan atensi segera untuk memastikan fungsi teknis yang optimal.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Bagus</span>
                              <span className="text-[10px] text-muted-foreground">Berfungsi Normal</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Tidak Bagus</span>
                              <span className="text-[10px] text-muted-foreground">Perlu Perbaikan</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                            <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Belum Ada</span>
                              <span className="text-[10px] text-muted-foreground">Belum Diperiksa</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Equipment List Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Daftar Inventaris Alat</h3>
                  {displayedEquipment.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayedEquipment.map((item) => {
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
                      Tidak ada alat ditemukan
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
