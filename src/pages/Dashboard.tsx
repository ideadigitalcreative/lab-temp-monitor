import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { RoomCard } from '@/components/RoomCard';
import { TemperatureChart } from '@/components/TemperatureChart';
import { StatCard } from '@/components/StatCard';
import { RoomFilter } from '@/components/RoomFilter';
import {
  useRooms,
  useRoomsWithLatestReadings,
  useTemperatureLogs,
} from '@/hooks/useRooms';
import {
  Thermometer,
  Droplets,
  Building2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

const Dashboard = () => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
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

  const stats = useMemo(() => {
    const latest = roomsWithReadings.filter((r) => r.latestReading);
    const temps = latest.map((r) => r.latestReading!.temperature);
    const humidities = latest.map((r) => r.latestReading!.humidity);
    const warnings = roomsWithReadings.filter(
      (r) => r.status === 'warning' || r.status === 'critical'
    ).length;

    return {
      avgTemp: temps.length
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        : '-',
      avgHumidity: humidities.length
        ? (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1)
        : '-',
      totalRooms: roomsWithReadings.length,
      warnings,
    };
  }, [roomsWithReadings]);

  const displayedRooms = selectedRoom
    ? roomsWithReadings.filter((r) => r.id === selectedRoom)
    : roomsWithReadings;

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

  const isLoading = roomsLoading || readingsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Monitoring Suhu Laboratorium
          </h1>
          <p className="text-muted-foreground">
            Dashboard pemantauan suhu dan kelembaban real-time untuk semua ruangan
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Rata-rata Suhu"
                value={`${stats.avgTemp}°C`}
                icon={<Thermometer className="w-4 h-4 md:w-5 md:h-5" />}
                iconClassName="text-blue-500 bg-blue-500/10"
              />
              <StatCard
                title="Rata-rata Kelembaban"
                value={`${stats.avgHumidity}%`}
                icon={<Droplets className="w-4 h-4 md:w-5 md:h-5" />}
                iconClassName="text-cyan-500 bg-cyan-500/10"
              />
              <StatCard
                title="Total Ruangan"
                value={stats.totalRooms}
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

            {/* Chart */}
            {chartData.length > 0 ? (
              <TemperatureChart
                data={chartData.slice(-50)}
                title={
                  selectedRoom
                    ? `Grafik ${rooms?.find((r) => r.id === selectedRoom)?.name}`
                    : 'Grafik Suhu & Kelembaban (Semua Ruangan)'
                }
              />
            ) : (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                <p>Belum ada data suhu untuk periode ini</p>
              </div>
            )}

            {/* Room Cards */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Daftar Ruangan</h2>
              {displayedRooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onClick={() => setSelectedRoom(room.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Tidak ada ruangan ditemukan
                </div>
              )}
            </div>
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
