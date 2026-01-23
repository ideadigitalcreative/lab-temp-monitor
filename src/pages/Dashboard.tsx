import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { RoomCard } from '@/components/RoomCard';
import { TemperatureChart } from '@/components/TemperatureChart';
import { StatCard } from '@/components/StatCard';
import { RoomFilter } from '@/components/RoomFilter';
import {
  getRoomsWithLatestReadings,
  getAllLogs,
  mockRooms,
} from '@/data/mockData';
import {
  Thermometer,
  Droplets,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

const Dashboard = () => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const roomsWithReadings = useMemo(() => getRoomsWithLatestReadings(), []);

  const filteredLogs = useMemo(() => {
    return getAllLogs(selectedRoom || undefined, dateRange?.from, dateRange?.to);
  }, [selectedRoom, dateRange]);

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
      totalRooms: mockRooms.length,
      warnings,
    };
  }, [roomsWithReadings]);

  const displayedRooms = selectedRoom
    ? roomsWithReadings.filter((r) => r.id === selectedRoom)
    : roomsWithReadings;

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

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Rata-rata Suhu"
            value={`${stats.avgTemp}°C`}
            icon={<Thermometer className="w-5 h-5" />}
          />
          <StatCard
            title="Rata-rata Kelembaban"
            value={`${stats.avgHumidity}%`}
            icon={<Droplets className="w-5 h-5" />}
          />
          <StatCard
            title="Total Ruangan"
            value={stats.totalRooms}
            icon={<Building2 className="w-5 h-5" />}
          />
          <StatCard
            title="Perlu Perhatian"
            value={stats.warnings}
            icon={<AlertTriangle className="w-5 h-5" />}
            className={stats.warnings > 0 ? 'border-status-warning' : ''}
          />
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl p-4">
          <RoomFilter
            rooms={mockRooms}
            selectedRoom={selectedRoom}
            dateRange={dateRange}
            onRoomChange={setSelectedRoom}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Chart */}
        {filteredLogs.length > 0 && (
          <TemperatureChart
            data={filteredLogs.slice(-50)}
            title={
              selectedRoom
                ? `Grafik ${mockRooms.find((r) => r.id === selectedRoom)?.name}`
                : 'Grafik Suhu & Kelembaban (Semua Ruangan)'
            }
          />
        )}

        {/* Room Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Daftar Ruangan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => setSelectedRoom(room.id)}
              />
            ))}
          </div>
        </div>
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
