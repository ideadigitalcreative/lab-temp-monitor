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
import { format, getHours, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';

/** Slot waktu pemeriksaan: Pagi 05:00-10:59, Siang 11:00-14:59, Sore 15:00-20:59 */
const getTimeSlot = (date: Date): 'pagi' | 'siang' | 'sore' | null => {
  const h = getHours(date);
  if (h >= 5 && h < 11) return 'pagi';
  if (h >= 11 && h < 15) return 'siang';
  if (h >= 15 && h < 21) return 'sore';
  return null;
};

export interface EquipmentTemperatureLogChart {
  id: string;
  roomId: string;
  roomName?: string;
  temperature: number;
  recordedAt: Date;
  recordedByName?: string;
}

export interface EquipmentTemperatureChartProps {
  data: EquipmentTemperatureLogChart[];
  sourceData?: EquipmentTemperatureLogChart[];
  title?: string;
}

export function EquipmentTemperatureChart({
  data,
  sourceData,
  title = 'Grafik Suhu Alat',
}: EquipmentTemperatureChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const isSingleLogMode = useMemo(() => {
    if (!data.length) return false;
    const nameLower = (title || data[0].roomName || '').toLowerCase();
    
    // Group 1: Explicit patterns provided by the user
    const singleLogKeywords = [
      'freezer', 
      'lemari ice', 
      'lemari es gea showcase', 
      'waterbath'
    ];
    
    if (singleLogKeywords.some(kw => nameLower.includes(kw))) return true;

    // Group 2: Data-driven heuristic (if we only ever see 1 slot used across all days)
    const uniqueSlots = new Set();
    data.forEach(log => {
      const slot = getTimeSlot(log.recordedAt);
      if (slot) uniqueSlots.add(slot);
    });
    
    return uniqueSlots.size <= 1;
  }, [data, title]);

  const chartData = useMemo(() => {
    if (!data.length) return [];

    const byDate = new Map<string, { pagi: number[]; siang: number[]; sore: number[]; all: number[] }>();

    for (const log of data) {
      const dayKey = format(startOfDay(log.recordedAt), 'yyyy-MM-dd');
      if (!byDate.has(dayKey)) {
        byDate.set(dayKey, { pagi: [], siang: [], sore: [], all: [] });
      }
      const row = byDate.get(dayKey)!;
      row.all.push(log.temperature);
      
      const slot = getTimeSlot(log.recordedAt);
      if (slot) row[slot].push(log.temperature);
    }

    const round2 = (v: number | undefined) =>
      v != null ? Number(Number(v).toFixed(2)) : undefined;

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, temps]) => {
        const d = new Date(dayKey);
        const avg = (arr: number[]) =>
          arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;
        
        return {
          date: format(d, 'dd/MM', { locale: id }),
          dateLabel: format(d, 'd MMM', { locale: id }),
          fullDate: format(d, 'dd MMM yyyy', { locale: id }),
          suhuPagi: isSingleLogMode ? undefined : round2(avg(temps.pagi)),
          suhuSiang: isSingleLogMode ? undefined : round2(avg(temps.siang)),
          suhuSore: isSingleLogMode ? undefined : round2(avg(temps.sore)),
          suhuHarian: isSingleLogMode ? round2(avg(temps.all)) : undefined,
        };
      });
  }, [data, isSingleLogMode]);

  const downloadExcel = () => {
    const logsToExport = sourceData ?? data;
    if (logsToExport.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const toastId = toast.loading('Sedang menyiapkan file Excel...');
    try {
      const rows = [...logsToExport].reverse().map((log) => ({
        Waktu: format(log.recordedAt, 'dd/MM/yyyy HH:mm:ss', { locale: id }),
        Alat: log.roomName || '-',
        'Suhu (°C)': log.temperature,
        Petugas: log.recordedByName || '-',
        Evaluasi: '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Suhu Alat');

      // Auto-width
      ws['!cols'] = [
        { wch: 20 }, // Waktu
        { wch: 30 }, // Alat
        { wch: 10 }, // Suhu
        { wch: 30 }, // Petugas
        { wch: 30 }, // Evaluasi
      ];

      XLSX.writeFile(wb, `Suhu_Alat_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
      toast.dismiss(toastId);
      toast.success('File Excel berhasil diunduh');
    } catch (error) {
      console.error('Excel error:', error);
      toast.dismiss(toastId);
      toast.error('Gagal membuat file Excel');
    }
  };

  const downloadPDF = async () => {
    if (!chartRef.current || chartData.length === 0) {
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
        ignoreElements: (el) => el.hasAttribute('data-html2canvas-ignore'),
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      try {
        const response = await fetch('/Logo-Labkesmas-Makassar-I.png');
        if (response.ok) {
          const blob = await response.blob();
          const logoData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          pdf.addImage(logoData, 'PNG', 15, 8, 60, 15);
        }
      } catch (e) {
        console.error('Failed to add logo to PDF', e);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('LABORATORIUM PENGUJI', pageWidth - 15, 12, { align: 'right' });
      pdf.setFontSize(10);
      pdf.text('LABORATORIUM KESEHATAN MASYARAKAT', pageWidth - 15, 17, { align: 'right' });
      pdf.setFontSize(11);
      pdf.text('MAKASSAR II', pageWidth - 15, 22, { align: 'right' });

      pdf.setDrawColor(37, 99, 235);
      pdf.setLineWidth(0.5);
      pdf.line(15, 27, pageWidth - 15, 27);

      pdf.setFontSize(16);
      pdf.setTextColor(33, 33, 33);
      const titleType = isSingleLogMode ? 'Harian' : 'Pagi / Siang / Sore';
      pdf.text(`Laporan Grafik Suhu Alat (${titleType})`, pageWidth / 2, 38, {
        align: 'center',
      });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Judul Grafik : ${title}`, 15, 46);

      const imgWidth = pageWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, 58, imgWidth, imgHeight);

      const tableTop = 58 + imgHeight + 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Data Pemantauan Suhu Alat:', 15, tableTop);
      pdf.setFontSize(8);
      pdf.setTextColor(60, 60, 60);
      let y = tableTop + 8;

      const drawTableHeader = (startY: number) => {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(15, startY - 4, pageWidth - 30, 6, 'F');
        pdf.text('Waktu', 18, startY);
        pdf.text('Nama Alat', 55, startY);
        pdf.text('Suhu', 110, startY);
        pdf.text('Petugas', 130, startY);
        return startY + 8;
      };

      y = drawTableHeader(y);

      const logsToExport = sourceData ?? data;
      const displayData = [...logsToExport].reverse();
      let totalPages = 1;

      displayData.forEach((log) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          totalPages++;
          y = 20;
          y = drawTableHeader(y);
        }
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(log.recordedAt, 'dd/MM/yyyy HH:mm:ss', { locale: id }), 18, y);
        pdf.text(log.roomName || '-', 55, y);
        pdf.text(`${log.temperature}°C`, 110, y);
        
        if (log.recordedByName) {
          const splitOfficer = pdf.splitTextToSize(log.recordedByName, 50);
          pdf.text(splitOfficer, 130, y);
        } else {
          pdf.text('-', 130, y);
        }

        y += 6;
      });

      // Footer
      if (y > pageHeight - 80) {
        pdf.addPage();
        totalPages++;
        y = 20;
      } else {
        y += 10;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Paraf Verif :', 15, y);
      
      y += 2;
      pdf.setDrawColor(33, 33, 33);
      pdf.setLineWidth(0.4);
      pdf.rect(15, y, 35, 15, 'S'); // Box for signature

      y += 22; // Increased from 18 to 22 for better spacing
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Evaluasi :', 15, y);

      y += 5;
      pdf.setDrawColor(33, 33, 33);
      pdf.setLineWidth(0.5);
      pdf.rect(15, y, pageWidth - 30, 25, 'S');

      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('(Keterangan: Diisi oleh Penanggung Jawab Ruangan/Laboratorium)', 17, y + 4);

      y += 32;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Catatan / Keterangan :', 15, y);

      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('- Batas Keberterimaan Temperatur : 20±3°C dari standar', 15, y);
      y += 5;
      pdf.text('- Batas Keberterimaan Kelembaban : 45% - 65% (Permen LHK Nomor 23 Tahun 2020)', 15, y);
      y += 5;
      pdf.text('- Segera laporkan jika parameter berada di luar batas normal.', 15, y);
      y += 5;
      pdf.text('- Pemeriksaan AKU (Angka Kuman Udara) hanya di lakukan pada Ruang Pengujian', 15, y);

      y += 8; // Adjusted from 12 to 8 for better balance
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8); 

      // Row 1
      pdf.text('Edisi', 15, y);
      pdf.text(': IV', 40, y);
      pdf.text('Tanggal Berlaku', 70, y);
      pdf.text(`: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, 100, y);
      pdf.text('Nomor Dokumen:', pageWidth - 15, y, { align: 'right' });

      y += 4;
      // Row 2
      pdf.text('Revisi', 15, y);
      pdf.text(': 0', 40, y);
      pdf.text('Halaman', 70, y);
      pdf.text(`: ${totalPages}/${totalPages}`, 100, y);
      pdf.text('F/BLKM-MKS/6.3/01/00/01', pageWidth - 15, y, { align: 'right' });

      pdf.save(`Laporan_Suhu_Alat_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
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
      const row = payload[0].payload;
      return (
        <div className="chart-tooltip rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            {row.dateLabel}
          </p>
          <p className="text-sm text-muted-foreground mb-2">{row.fullDate}</p>
          <div className="space-y-1 pt-2 border-t border-border/50">
            {isSingleLogMode ? (
              <p className="text-sm flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f97415' }} />
                  <span className="text-muted-foreground">Suhu:</span>
                </span>
                <span className="font-mono font-bold" style={{ color: '#f97415' }}>{row.suhuHarian}°C</span>
              </p>
            ) : (
              <>
                {row.suhuPagi != null && (
                  <p className="text-sm flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-pagi))]" />
                      <span className="text-muted-foreground">Suhu Pagi:</span>
                    </span>
                    <span className="font-mono font-bold">{row.suhuPagi}°C</span>
                  </p>
                )}
                {row.suhuSiang != null && (
                  <p className="text-sm flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-siang))]" />
                      <span className="text-muted-foreground">Suhu Siang:</span>
                    </span>
                    <span className="font-mono font-bold">{row.suhuSiang}°C</span>
                  </p>
                )}
                {row.suhuSore != null && (
                  <p className="text-sm flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-sore))]" />
                      <span className="text-muted-foreground">Suhu Sore:</span>
                    </span>
                    <span className="font-mono font-bold">{row.suhuSore}°C</span>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const lineProps = {
    type: 'monotone' as const,
    strokeWidth: 2.5,
    dot: { strokeWidth: 2, r: 3, fill: 'hsl(var(--background))' },
    activeDot: { r: 5, strokeWidth: 0 },
    animationDuration: 1000,
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
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
              opacity={0.5}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 11, fontWeight: 'medium' }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}°C`}
              domain={['auto', 'auto']}
              dx={-5}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: 'hsl(var(--primary))',
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--destructive))"
              strokeDasharray="3 3"
              label={{
                value: '0°C',
                position: 'right',
                fill: 'hsl(var(--destructive))',
                fontSize: 10,
              }}
              opacity={0.5}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
              formatter={(value) => (
                <span className="text-muted-foreground ml-1">
                  {isSingleLogMode ? 'Suhu Alat' : (value === 'suhuPagi' ? 'Suhu Pagi' : value === 'suhuSiang' ? 'Suhu Siang' : 'Suhu Sore')}
                </span>
              )}
            />
            {isSingleLogMode ? (
              <Line
                {...lineProps}
                dataKey="suhuHarian"
                name="Suhu Alat"
                stroke="#f97415"
                dot={{ ...lineProps.dot, stroke: '#f97415' }}
                activeDot={{ ...lineProps.activeDot, fill: '#f97415' }}
                connectNulls
              />
            ) : (
              <>
                <Line
                  {...lineProps}
                  dataKey="suhuPagi"
                  name="suhuPagi"
                  stroke="hsl(var(--chart-pagi))"
                  dot={{ ...lineProps.dot, stroke: 'hsl(var(--chart-pagi))' }}
                  activeDot={{ ...lineProps.activeDot, fill: 'hsl(var(--chart-pagi))' }}
                  connectNulls
                />
                <Line
                  {...lineProps}
                  dataKey="suhuSiang"
                  name="suhuSiang"
                  stroke="hsl(var(--chart-siang))"
                  dot={{ ...lineProps.dot, stroke: 'hsl(var(--chart-siang))' }}
                  activeDot={{ ...lineProps.activeDot, fill: 'hsl(var(--chart-siang))' }}
                  connectNulls
                />
                <Line
                  {...lineProps}
                  dataKey="suhuSore"
                  name="suhuSore"
                  stroke="hsl(var(--chart-sore))"
                  dot={{ ...lineProps.dot, stroke: 'hsl(var(--chart-sore))' }}
                  activeDot={{ ...lineProps.activeDot, fill: 'hsl(var(--chart-sore))' }}
                  connectNulls
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
