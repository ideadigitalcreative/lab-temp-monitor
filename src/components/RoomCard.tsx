import { RoomWithLatestReading } from '@/types';
import { StatusBadge } from './StatusBadge';
import { Thermometer, Droplets, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface RoomCardProps {
  room: RoomWithLatestReading;
  onClick?: () => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  const { latestReading, status } = room;

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-slide-up"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground">{room.name}</h3>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{room.location}</span>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {latestReading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Thermometer className="w-3.5 h-3.5 text-chart-temperature" />
                <span>Suhu</span>
              </div>
              <p className="text-2xl font-semibold font-mono text-foreground">
                {latestReading.temperature}
                <span className="text-sm font-normal text-muted-foreground">°C</span>
              </p>
            </div>
            <div className="bg-accent/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Droplets className="w-3.5 h-3.5 text-chart-humidity" />
                <span>Kelembaban</span>
              </div>
              <p className="text-2xl font-semibold font-mono text-foreground">
                {latestReading.humidity}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Clock className="w-3 h-3" />
            <span>
              Update: {format(latestReading.recordedAt, 'dd MMM yyyy, HH:mm', { locale: id })}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground text-sm py-4 text-center">
          Belum ada data
        </div>
      )}
    </div>
  );
}
