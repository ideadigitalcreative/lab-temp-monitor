import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Thermometer, Droplets, MapPin, CheckCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Asset {
  id: string;
  name: string;
  location: string;
  barcode: string;
  type?: string;
}

const temperatureSchema = z.object({
  temperature: z.coerce
    .number({ required_error: 'Suhu wajib diisi', invalid_type_error: 'Suhu harus angka' })
    .min(-50, 'Suhu minimal -50°C')
    .max(100, 'Suhu maksimal 100°C'),
  humidity: z.coerce
    .number({ invalid_type_error: 'Kelembaban harus angka' })
    .min(0, 'Kelembaban minimal 0%')
    .max(100, 'Kelembaban maksimal 100%')
    .optional()
    .or(z.literal('')),
  recordedAt: z.string().optional(),
});

type TemperatureFormData = z.infer<typeof temperatureSchema>;

interface TemperatureInputFormProps {
  room: Asset;
  onSubmit: (data: TemperatureFormData & { customDate?: Date }) => void;
  onReset: () => void;
  isSubmitting?: boolean;
  showHumidity?: boolean;
}

export function TemperatureInputForm({
  room,
  onSubmit,
  onReset,
  isSubmitting = false,
  showHumidity = true,
}: TemperatureInputFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [useManualTime, setUseManualTime] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TemperatureFormData>({
    resolver: zodResolver(temperatureSchema),
    defaultValues: {
      temperature: undefined,
      humidity: undefined,
      recordedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const manualDate = watch('recordedAt');

  const handleFormSubmit = async (data: TemperatureFormData) => {
    const customDate = useManualTime && data.recordedAt ? new Date(data.recordedAt) : undefined;
    await onSubmit({ ...data, customDate });
    setSubmitted(true);
    setTimeout(() => {
      reset();
      setSubmitted(false);
      onReset();
    }, 2000);
  };

  if (submitted) {
    return (
      <div className="glass-card rounded-xl p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-status-normal-bg flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-status-normal" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Data Tersimpan!</h3>
        <p className="text-muted-foreground text-sm">
          Data {!showHumidity ? 'alat' : 'ruangan'} {room.name} berhasil dicatat.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Asset Info */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <h3 className="font-semibold text-lg text-foreground mb-3">
          {!showHumidity ? 'Alat Terpilih' : 'Ruangan Terpilih'}
        </h3>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-primary">{room.name}</p>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="w-4 h-4" />
            <span>{room.location} {room.type && `(${room.type})`}</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Barcode: {room.barcode}
          </p>
        </div>
      </div>

      {/* Input Form */}
      <div className="glass-card rounded-xl p-6 space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="temperature" className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-chart-temperature" />
              Suhu (°C)
            </Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              placeholder="Masukkan suhu..."
              className={cn(
                "text-lg font-mono focus-visible:ring-chart-temperature",
                errors.temperature && "border-destructive focus-visible:ring-destructive"
              )}
              {...register('temperature')}
            />
            {errors.temperature && (
              <p className="text-xs text-destructive mt-1">{errors.temperature.message}</p>
            )}
          </div>

          {showHumidity && (
            <div className="space-y-2">
              <Label htmlFor="humidity" className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-chart-humidity" />
                Kelembaban (%)
              </Label>
              <Input
                id="humidity"
                type="number"
                step="0.1"
                placeholder="Masukkan kelembaban..."
                className={cn(
                  "text-lg font-mono focus-visible:ring-chart-humidity",
                  errors.humidity && "border-destructive focus-visible:ring-destructive"
                )}
                {...register('humidity')}
              />
              {errors.humidity && (
                <p className="text-xs text-destructive mt-1">{errors.humidity.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp Selection */}
      <div className="glass-card rounded-xl p-4 space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between">
          <Label htmlFor="manual-time-toggle" className="text-sm font-medium cursor-pointer">
            Gunakan Waktu Manual
          </Label>
          <input
            id="manual-time-toggle"
            type="checkbox"
            className="w-4 h-4"
            checked={useManualTime}
            onChange={(e) => setUseManualTime(e.target.checked)}
          />
        </div>

        {useManualTime ? (
          <div className="space-y-2 animate-fade-in">
            <Label htmlFor="recordedAt" className="text-xs text-muted-foreground">
              Pilih Tanggal & Waktu
            </Label>
            <Input
              id="recordedAt"
              type="datetime-local"
              className="font-mono"
              {...register('recordedAt')}
            />
          </div>
        ) : (
          <div className="bg-secondary/30 rounded-lg p-3 text-center transition-all">
            <p className="text-sm text-muted-foreground">
              Waktu pencatatan (Otomatis):{' '}
              <span className="font-medium text-foreground block mt-1">
                {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset();
            onReset();
          }}
          className="flex-1"
        >
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
        </Button>
      </div>
    </form>
  );
}
