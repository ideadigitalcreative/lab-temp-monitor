import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TemperatureLog {
  id: string;
  roomId: string;
  roomName?: string;
  temperature: number;
  humidity: number;
  recordedAt: Date;
}

interface TemperatureChartProps {
  data: TemperatureLog[];
  title?: string;
}

export function TemperatureChart({ data, title = 'Grafik Suhu' }: TemperatureChartProps) {
  const chartData = useMemo(() => {
    return data.map((log) => ({
      time: format(log.recordedAt, 'dd/MM HH:mm', { locale: id }),
      temperature: log.temperature,
      humidity: log.humidity,
      fullTime: format(log.recordedAt, 'dd MMM yyyy, HH:mm', { locale: id }),
    }));
  }, [data]);

  const downloadData = () => {
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diunduh');
      return;
    }

    try {
      // Create CSV content
      const headers = ['Waktu', 'Ruangan', 'Suhu (°C)', 'Kelembaban (%)'];
      const csvRows = [
        headers.join(','),
        ...data.map(log => [
          format(log.recordedAt, 'yyyy-MM-dd HH:mm:ss'),
          log.roomName || 'Unknown',
          log.temperature,
          log.humidity
        ].join(','))
      ];

      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.setAttribute('href', url);
      link.setAttribute('download', `Laporan_Sensor_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Laporan berhasil diunduh (CSV)');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Gagal mengunduh laporan');
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="text-sm font-medium text-foreground mb-2">
            {payload[0]?.payload?.fullTime}
          </p>
          <div className="space-y-1">
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-chart-temperature" />
              <span className="text-muted-foreground">Suhu:</span>
              <span className="font-mono font-medium">{payload[0]?.value}°C</span>
            </p>
            <p className="text-sm flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-chart-humidity" />
              <span className="text-muted-foreground">Kelembaban:</span>
              <span className="font-mono font-medium">{payload[1]?.value}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg">{title}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadData}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Ekspor CSV
        </Button>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="temp"
              orientation="left"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}°C`}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-sm text-foreground">
                  {value === 'temperature' ? 'Suhu (°C)' : 'Kelembaban (%)'}
                </span>
              )}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              stroke="hsl(var(--chart-temperature))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              stroke="hsl(var(--chart-humidity))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

