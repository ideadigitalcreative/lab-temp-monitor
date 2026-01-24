import { useMemo, useRef } from 'react';
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
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '@/hooks/useAuth';

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
  const chartRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const chartData = useMemo(() => {
    return data.map((log) => ({
      time: format(log.recordedAt, 'dd/MM HH:mm', { locale: id }),
      temperature: log.temperature,
      humidity: log.humidity,
      fullTime: format(log.recordedAt, 'dd MMM yyyy, HH:mm', { locale: id }),
    }));
  }, [data]);


  const downloadPDF = async () => {
    if (!chartRef.current || data.length === 0) {
      toast.error('Tidak ada data untuk laporan');
      return;
    }

    const toastId = toast.loading('Sedang menyiapkan laporan PDF...');

    try {
      const element = chartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore')
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Add Title
      pdf.setFontSize(18);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Laporan Monitoring Laboratorium', 15, 20);

      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Judul: ${title}`, 15, 28);
      pdf.text(`Tanggal Cetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}`, 15, 34);

      // Add Chart Image
      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, 45, imgWidth, imgHeight);

      // Add Data Table
      const tableTop = imgHeight + 55;
      pdf.setFontSize(12);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Detail Data Sensor:', 15, tableTop);

      pdf.setFontSize(8);
      pdf.setTextColor(60, 60, 60);
      let y = tableTop + 8;

      // Header Table
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, y - 4, pageWidth - 30, 6, 'F');
      pdf.text('Waktu', 20, y);
      pdf.text('Ruangan', 70, y);
      pdf.text('Suhu', 130, y);
      pdf.text('Kelembaban', 170, y);

      y += 8;

      // Show only last 20 records in table to avoid page overflow for now
      const displayData = [...data].slice(-20).reverse();

      displayData.forEach((log) => {
        if (y > pageHeight - 20) return; // Basic overflow check
        pdf.text(format(log.recordedAt, 'dd/MM/yyyy HH:mm'), 20, y);
        pdf.text(log.roomName || '-', 70, y);
        pdf.text(`${log.temperature}°C`, 130, y);
        pdf.text(`${log.humidity}%`, 170, y);
        y += 6;
      });

      pdf.save(`Laporan_Grafik_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      toast.dismiss(toastId);
      toast.success('Laporan PDF berhasil diunduh');
    } catch (error) {
      console.error('PDF error:', error);
      toast.dismiss(toastId);
      toast.error('Gagal membuat PDF');
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
    <div className="glass-card rounded-xl p-5" ref={chartRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="font-semibold text-lg">{title}</h3>
        {user && (
          <div className="flex gap-2 w-full sm:w-auto" data-html2canvas-ignore>
            <Button
              variant="default"
              size="sm"
              onClick={downloadPDF}
              className="flex-1 sm:flex-none gap-2 shadow-button bg-primary hover:bg-primary/90"
              title="Unduh laporan grafik dalam format PDF"
            >
              <FileText className="w-4 h-4" />
              <span>Cetak Laporan (PDF)</span>
            </Button>
          </div>
        )}
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
              tick={{ fontSize: 12, fontWeight: 'bold' }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              label={{ value: 'Waktu', position: 'insideBottom', offset: -5, style: { fontSize: '14px', fontWeight: 'bold' } }}
            />
            <YAxis
              yAxisId="temp"
              orientation="left"
              tick={{ fontSize: 12, fontWeight: 'bold' }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}°C`}
              label={{ value: 'Suhu (°C)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: '14px', fontWeight: 'bold' } }}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              tick={{ fontSize: 12, fontWeight: 'bold' }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              label={{ value: 'Kelembaban (%)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: '14px', fontWeight: 'bold' } }}
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
              strokeWidth={3}
              dot={{ stroke: 'hsl(var(--chart-temperature))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
            <Line
              yAxisId="humidity"
              type="monotone"
              dataKey="humidity"
              stroke="hsl(var(--chart-humidity))"
              strokeWidth={3}
              dot={{ stroke: 'hsl(var(--chart-humidity))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


