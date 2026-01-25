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
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';

interface TemperatureLog {
  id: string;
  roomId: string;
  roomName?: string;
  temperature: number;
  humidity?: number;
  recordedAt: Date;
}

interface TemperatureChartProps {
  data: TemperatureLog[];
  sourceData?: TemperatureLog[];
  title?: string;
}

export function TemperatureChart({ data, sourceData, title = 'Grafik Suhu' }: TemperatureChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const hasHumidity = useMemo(() => {
    return data.some(log => log.humidity !== undefined && log.humidity !== null);
  }, [data]);

  const chartData = useMemo(() => {
    return data.map((log) => ({
      time: format(log.recordedAt, 'dd/MM HH:mm', { locale: id }),
      temperature: log.temperature,
      humidity: log.humidity,
      name: log.roomName,
      fullTime: format(log.recordedAt, 'dd MMM yyyy, HH:mm', { locale: id }),
    }));
  }, [data]);

  const downloadExcel = () => {
    const logsToExport = sourceData || data;

    if (logsToExport.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const toastId = toast.loading('Sedang menyiapkan file Excel...');

    try {
      const exportData = [...logsToExport].reverse().map((log) => ({
        Waktu: format(log.recordedAt, 'dd/MM/yyyy HH:mm:ss', { locale: id }),
        Asset: log.roomName || '-',
        'Suhu (°C)': log.temperature,
        ...(hasHumidity ? { 'Kelembaban (%)': log.humidity ?? '-' } : {}),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Sensor");

      // Auto-width columns
      const wscols = [
        { wch: 20 }, // Waktu
        { wch: 30 }, // Asset
        { wch: 15 }, // Suhu
        { wch: 15 }, // Kelembaban
      ];
      ws['!cols'] = wscols;

      XLSX.writeFile(wb, `Laporan_Data_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

      toast.dismiss(toastId);
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      console.error('Excel error:', error);
      toast.dismiss(toastId);
      toast.error('Gagal membuat file Excel');
    }
  };

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
      const tableTop = imgHeight > pageHeight - 100 ? pageHeight - 50 : imgHeight + 55;
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
      pdf.text('Asset', 70, y);
      pdf.text('Suhu', 130, y);
      if (hasHumidity) {
        pdf.text('Kelembaban', 170, y);
      }

      y += 8;

      const displayData = [...data].slice(-20).reverse();

      displayData.forEach((log) => {
        if (y > pageHeight - 20) return;
        pdf.text(format(log.recordedAt, 'dd/MM/yyyy HH:mm'), 20, y);
        pdf.text(log.roomName || '-', 70, y);
        pdf.text(`${log.temperature}°C`, 130, y);
        if (hasHumidity) {
          pdf.text(log.humidity !== undefined ? `${log.humidity}%` : '-', 170, y);
        }
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip">
          <div className="mb-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">{data.name}</p>
            <p className="text-sm font-medium text-foreground">{data.fullTime}</p>
          </div>
          <div className="space-y-1 pt-2 border-t border-border/50">
            <p className="text-sm flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-chart-temperature" />
                <span className="text-muted-foreground">Suhu:</span>
              </span>
              <span className="font-mono font-bold text-foreground">{payload[0]?.value}°C</span>
            </p>
            {hasHumidity && payload[1]?.value !== undefined && (
              <p className="text-sm flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-chart-humidity" />
                  <span className="text-muted-foreground">Lembab:</span>
                </span>
                <span className="font-mono font-bold text-foreground">{payload[1]?.value}%</span>
              </p>
            )}
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
              variant="outline"
              size="sm"
              onClick={downloadExcel}
              className="flex-1 sm:flex-none gap-2"
              title="Unduh data dalam format Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={downloadPDF}
              className="flex-1 sm:flex-none gap-2 shadow-button bg-primary hover:bg-primary/90"
              title="Unduh laporan grafik dalam format PDF"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </Button>
          </div>
        )}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: hasHumidity ? 20 : 5, left: 10, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
              opacity={0.5}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              yAxisId="temp"
              orientation="left"
              tick={{ fontSize: 11, fontWeight: 'medium' }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}°C`}
              domain={['auto', 'auto']}
              dx={-5}
            />
            {hasHumidity && (
              <YAxis
                yAxisId="humidity"
                orientation="right"
                tick={{ fontSize: 11, fontWeight: 'medium' }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                dx={5}
              />
            )}
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <ReferenceLine yAxisId="temp" y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: '0°C', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 10 }} opacity={0.5} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
              formatter={(value) => (
                <span className="text-muted-foreground ml-1">
                  {value === 'temperature' ? 'Suhu' : 'Kelembaban'}
                </span>
              )}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="temperature"
              stroke="hsl(var(--chart-temperature))"
              strokeWidth={2.5}
              dot={{ stroke: 'hsl(var(--chart-temperature))', strokeWidth: 2, r: 3, fill: 'hsl(var(--background))' }}
              activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--chart-temperature))' }}
              animationDuration={1000}
            />
            {hasHumidity && (
              <Line
                yAxisId="humidity"
                type="monotone"
                dataKey="humidity"
                name="humidity"
                stroke="hsl(var(--chart-humidity))"
                strokeWidth={2.5}
                dot={{ stroke: 'hsl(var(--chart-humidity))', strokeWidth: 2, r: 3, fill: 'hsl(var(--background))' }}
                activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(var(--chart-humidity))' }}
                animationDuration={1000}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
