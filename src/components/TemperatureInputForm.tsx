import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Room } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Thermometer, Droplets, MapPin, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const temperatureSchema = z.object({
  temperature: z
    .number({ required_error: 'Suhu wajib diisi' })
    .min(0, 'Suhu minimal 0°C')
    .max(50, 'Suhu maksimal 50°C'),
  humidity: z
    .number({ required_error: 'Kelembaban wajib diisi' })
    .min(0, 'Kelembaban minimal 0%')
    .max(100, 'Kelembaban maksimal 100%'),
});

type TemperatureFormData = z.infer<typeof temperatureSchema>;

interface TemperatureInputFormProps {
  room: Room;
  onSubmit: (data: TemperatureFormData) => void;
  onReset: () => void;
  isSubmitting?: boolean;
}

export function TemperatureInputForm({
  room,
  onSubmit,
  onReset,
  isSubmitting = false,
}: TemperatureInputFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TemperatureFormData>({
    resolver: zodResolver(temperatureSchema),
  });

  const handleFormSubmit = (data: TemperatureFormData) => {
    onSubmit(data);
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
          Data suhu ruangan {room.name} berhasil dicatat.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Room Info */}
      <div className="glass-card rounded-xl p-5 animate-slide-up">
        <h3 className="font-semibold text-lg text-foreground mb-3">Ruangan Terpilih</h3>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-primary">{room.name}</p>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <MapPin className="w-4 h-4" />
            <span>{room.location}</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Barcode: {room.barcode}
          </p>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="temperature" className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-chart-temperature" />
            Suhu (°C)
          </Label>
          <Input
            id="temperature"
            type="number"
            step="0.1"
            placeholder="22.5"
            className="font-mono text-lg"
            {...register('temperature', { valueAsNumber: true })}
          />
          {errors.temperature && (
            <p className="text-sm text-status-critical">{errors.temperature.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="humidity" className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-chart-humidity" />
            Kelembaban (%)
          </Label>
          <Input
            id="humidity"
            type="number"
            step="0.1"
            placeholder="55"
            className="font-mono text-lg"
            {...register('humidity', { valueAsNumber: true })}
          />
          {errors.humidity && (
            <p className="text-sm text-status-critical">{errors.humidity.message}</p>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="bg-secondary/50 rounded-lg p-3 text-center">
        <p className="text-sm text-muted-foreground">
          Waktu pencatatan:{' '}
          <span className="font-medium text-foreground">
            {format(new Date(), 'dd MMMM yyyy, HH:mm:ss', { locale: id })}
          </span>
        </p>
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
