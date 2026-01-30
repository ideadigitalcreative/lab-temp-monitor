import { EquipmentWithLatestReading } from '@/hooks/useEquipment';
import { StatusBadge } from './StatusBadge';
import { Thermometer, MapPin, Clock, ClipboardCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { getConditionInfo, EquipmentInspection } from '@/hooks/useEquipmentInspection';
import { cn } from '@/lib/utils';

interface EquipmentCardProps {
    equipment: EquipmentWithLatestReading & { latestInspection?: EquipmentInspection };
    onClick?: () => void;
}

export function EquipmentCard({ equipment, onClick }: EquipmentCardProps) {
    const { latestReading, status, latestInspection } = equipment;
    const inspectionConfig = latestInspection ? getConditionInfo(latestInspection.condition) : null;

    return (
        <div
            onClick={onClick}
            className="glass-card rounded-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-slide-up flex flex-col justify-between"
        >
            <div>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-lg text-foreground line-clamp-1">{equipment.name}</h3>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{equipment.location}</span>
                        </div>
                    </div>
                    {latestReading ? (
                        <StatusBadge status={status} />
                    ) : (
                        inspectionConfig ? (
                            <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border", inspectionConfig.bgColor, inspectionConfig.color, inspectionConfig.borderColor)}>
                                {inspectionConfig.label}
                            </span>
                        ) : null
                    )}
                </div>

                <div className="space-y-3">
                    {latestReading ? (
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
                    ) : null}

                    {latestInspection && (
                        <div className={cn("rounded-lg p-3 flex items-center justify-between", inspectionConfig?.bgColor, "bg-opacity-40")}>
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className={cn("w-4 h-4", inspectionConfig?.color)} />
                                <span className="text-xs font-medium">Kondisi Alat</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {latestInspection.condition === 'bagus' ?
                                    <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                                    <AlertCircle className="w-4 h-4 text-red-600" />
                                }
                                <span className={cn("text-xs font-bold", inspectionConfig?.color)}>
                                    {inspectionConfig?.label}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-1">
                {latestReading && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                        <Thermometer className="w-3 h-3" />
                        <span>
                            Suhu: {format(new Date(latestReading.recorded_at), 'dd MMM, HH:mm', { locale: id })}
                        </span>
                    </div>
                )}
                {latestInspection && (
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                        <Clock className="w-3 h-3" />
                        <span>
                            Cek Fisik: {format(new Date(latestInspection.inspected_at), 'dd MMM, HH:mm', { locale: id })}
                        </span>
                    </div>
                )}
                {!latestReading && !latestInspection && (
                    <div className="text-muted-foreground text-xs text-center py-2">
                        Belum ada data pemantauan
                    </div>
                )}
            </div>
        </div>
    );
}
