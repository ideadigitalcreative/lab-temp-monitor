import { EquipmentWithLatestReading } from '@/hooks/useEquipment';
import { StatusBadge } from './StatusBadge';
import { Thermometer, Droplets, MapPin, Clock, Box } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface EquipmentCardProps {
    equipment: EquipmentWithLatestReading;
    onClick?: () => void;
}

export function EquipmentCard({ equipment, onClick }: EquipmentCardProps) {
    const { latestReading, status } = equipment;

    return (
        <div
            onClick={onClick}
            className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-slide-up"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-lg text-foreground">{equipment.name}</h3>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{equipment.location}</span>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            {latestReading ? (
                <div className="space-y-3">
                    <div className="bg-accent/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Thermometer className="w-3.5 h-3.5 text-chart-temperature" />
                            <span>Suhu Terakhir</span>
                        </div>
                        <p className="text-3xl font-semibold font-mono text-foreground">
                            {latestReading.temperature}
                            <span className="text-sm font-normal text-muted-foreground ml-1">°C</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Clock className="w-3 h-3" />
                        <span>
                            Update: {format(new Date(latestReading.recorded_at), 'dd MMM yyyy, HH:mm', { locale: id })}
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
