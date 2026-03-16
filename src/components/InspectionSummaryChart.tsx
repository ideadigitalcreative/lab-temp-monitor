import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from 'recharts';
import { EquipmentWithLatestInspection, EquipmentInspection } from '@/hooks/useEquipmentInspection';
import { cn } from '@/lib/utils';
import { ClipboardCheck, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

import { DateRange } from 'react-day-picker';

interface InspectionSummaryChartProps {
    data: EquipmentWithLatestInspection[]; // Latest state for overview
    historyData?: EquipmentInspection[];   // Historical data for trend
    dateRange?: DateRange;
    className?: string;
}

const COLORS = {
    bagus: '#10b981', // green-500
    layak_pakai: '#3b82f6', // blue-500
    tidak_bagus: '#ef4444', // red-500
    perlu_atensi: '#f97316', // orange-500
};

export function InspectionSummaryChart({ data, historyData, dateRange, className }: InspectionSummaryChartProps) {
    const chartRef = useRef<HTMLDivElement>(null);
    
    // Process historical data for Line Chart
    const trendData = useMemo(() => {
        if (!historyData || historyData.length === 0) return [];

        const byDate = new Map<string, { bagus: number, layak: number, tidak: number, atensi: number }>();

        historyData.forEach(log => {
            const dateKey = format(startOfDay(new Date(log.inspected_at)), 'yyyy-MM-dd');
            if (!byDate.has(dateKey)) {
                byDate.set(dateKey, { bagus: 0, layak: 0, tidak: 0, atensi: 0 });
            }
            const stats = byDate.get(dateKey)!;
            if (log.condition === 'bagus') stats.bagus++;
            else if (log.condition === 'layak_pakai') stats.layak++;
            else if (log.condition === 'tidak_bagus') stats.tidak++;
            else if (log.condition === 'perlu_atensi') stats.atensi++;
        });

        return Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([dateKey, stats]) => ({
                date: format(new Date(dateKey), 'dd/MM', { locale: id }),
                fullDate: format(new Date(dateKey), 'dd MMM yyyy', { locale: id }),
                'Bagus': stats.bagus,
                'Layak Pakai': stats.layak,
                'Tidak Bagus': stats.tidak,
                'Perlu Atensi': stats.atensi
            }));
    }, [historyData]);

    const totalAssets = data.length;
    
    // For summary stats (latest)
    const latestStats = useMemo(() => {
        let bagus = 0;
        let layak = 0;
        data.forEach(item => {
            if (item.latestInspection?.condition === 'bagus') bagus++;
            if (item.latestInspection?.condition === 'layak_pakai') layak++;
        });
        return { bagus, layak };
    }, [data]);

    const goodPercent = totalAssets > 0 ? Math.round((latestStats.bagus + latestStats.layak) / totalAssets * 100) : 0;

    const downloadExcel = () => {
        const toastId = toast.loading('Menyiapkan file Excel...');
        try {
            const rows = trendData.map(d => ({
                Tanggal: d.fullDate,
                Bagus: d.Bagus,
                'Layak Pakai': d['Layak Pakai'],
                'Tidak Bagus': d['Tidak Bagus'],
                'Perlu Atensi': d['Perlu Atensi']
            }));
            
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Tren Kondisi Alat');
            
            const fileSuffix = dateRange?.from 
                ? `${format(dateRange.from, 'yyyyMMdd')}_${dateRange.to ? format(dateRange.to, 'yyyyMMdd') : 'now'}`
                : format(new Date(), 'yyyyMMdd_HHmm');
                
            XLSX.writeFile(wb, `Tren_Pemeriksaan_${fileSuffix}.xlsx`);
            
            toast.dismiss(toastId);
            toast.success('Excel berhasil diunduh');
        } catch (error) {
            toast.dismiss(toastId);
            toast.error('Gagal membuat Excel');
        }
    };

    const downloadPDF = async () => {
        if (!chartRef.current) return;
        const toastId = toast.loading('Menyiapkan PDF...');
        try {
            const canvas = await html2canvas(chartRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Header - Logo & Lab Name
            try {
                const response = await fetch('/Logo-Labkesmas-Makassar-I.png');
                if (response.ok) {
                const blob = await response.blob();
                const logoData = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                pdf.addImage(logoData, 'PNG', 15, 8, 55, 14);
                }
            } catch (e) { console.error('Logo failed', e); }

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text('LABORATORIUM PENGUJI', pageWidth - 15, 12, { align: 'right' });
            pdf.setFontSize(9);
            pdf.text('LABORATORIUM KESEHATAN MASYARAKAT MAKASSAR II', pageWidth - 15, 17, { align: 'right' });
            
            pdf.setDrawColor(37, 99, 235);
            pdf.setLineWidth(0.5);
            pdf.line(15, 25, pageWidth - 15, 25);
            
            pdf.setFontSize(14);
            pdf.setTextColor(33, 33, 33);
            pdf.text('Laporan Tren Pemeriksaan Fisik Alat', pageWidth / 2, 35, { align: 'center' });
            
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            
            const periodText = dateRange?.from 
                ? `${format(dateRange.from, 'dd MMM yyyy', { locale: id })} - ${dateRange.to ? format(dateRange.to, 'dd MMM yyyy', { locale: id }) : 'Sekarang'}`
                : 'Terakhir';
                
            pdf.text(`Periode: ${periodText} | Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: id })}`, pageWidth / 2, 41, { align: 'center' });
            
            const imgWidth = pageWidth - 30;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 15, 50, imgWidth, imgHeight);

            // Table Header
            let y = 50 + imgHeight + 15;
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Data Status Kondisi Fisik Alat:', 15, y);
            y += 8;

            pdf.setFillColor(240, 240, 240);
            pdf.rect(15, y - 4, pageWidth - 30, 7, 'F');
            pdf.setFontSize(9);
            pdf.text('No', 18, y + 1);
            pdf.text('Nama Alat', 30, y + 1);
            pdf.text('Lokasi', 90, y + 1);
            pdf.text('Kondisi Terakhir', 140, y + 1);
            pdf.text('Petugas', 170, y + 1);
            y += 8;

            // Table Content
            pdf.setFont('helvetica', 'normal');
            data.forEach((item, index) => {
                if (y > pageHeight - 20) {
                    pdf.addPage();
                    y = 20;
                    pdf.setFillColor(240, 240, 240);
                    pdf.rect(15, y - 4, pageWidth - 30, 7, 'F');
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('No', 18, y + 1);
                    pdf.text('Nama Alat', 30, y + 1);
                    pdf.text('Lokasi', 90, y + 1);
                    pdf.text('Kondisi Terakhir', 140, y + 1);
                    pdf.text('Petugas', 170, y + 1);
                    pdf.setFont('helvetica', 'normal');
                    y += 8;
                }

                const condition = item.latestInspection?.condition || 'belum_update';
                const conditionLabel = condition === 'bagus' ? 'Bagus' : 
                                     condition === 'layak_pakai' ? 'Layak Pakai' :
                                     condition === 'tidak_bagus' ? 'Tidak Bagus' :
                                     condition === 'perlu_atensi' ? 'Perlu Atensi' : 'Belum Update';

                pdf.text(`${index + 1}`, 18, y);
                pdf.text(item.name || '-', 30, y);
                pdf.text(item.location || '-', 90, y);
                pdf.text(conditionLabel, 140, y);
                pdf.text(item.latestInspection?.profiles?.full_name || '-', 170, y);
                
                pdf.setDrawColor(240, 240, 240);
                pdf.line(15, y + 2, pageWidth - 15, y + 2);
                y += 7;
            });
            
            pdf.save(`Laporan_Pemeriksaan_Lengkap_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
            toast.dismiss(toastId);
            toast.success('PDF Lengkap berhasil diunduh');
        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error('Gagal membuat PDF');
        }
    };

    return (
        <Card className={cn("glass-card border-none overflow-hidden h-full flex flex-col", className)}>
            <CardHeader className="pb-2 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/20">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Tren Kelayakan Fisik</CardTitle>
                            <CardDescription>Visualisasi history pemeriksaan alat</CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto" data-html2canvas-ignore>
                        <Button variant="outline" size="sm" onClick={downloadExcel} className="flex-1 sm:flex-none gap-2 h-8 px-3 rounded-lg border-primary/20 hover:bg-primary/5 text-primary">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span className="text-xs">Excel</span>
                        </Button>
                        <Button variant="default" size="sm" onClick={downloadPDF} className="flex-1 sm:flex-none gap-2 h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-xs">PDF</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[350px] flex flex-col pt-4">
                <div className="flex-1 w-full" ref={chartRef}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={trendData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis 
                                tick={{ fontSize: 11, fontWeight: 500, fill: 'hsl(var(--muted-foreground))' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-2xl ring-1 ring-black/5 min-w-[150px]">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border/50 pb-1">{data.fullDate}</p>
                                                <div className="space-y-2">
                                                    {payload.map((p: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                                <span className="text-xs font-semibold">{p.name}:</span>
                                                            </div>
                                                            <span className="text-xs font-bold font-mono">{p.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend 
                                verticalAlign="top" 
                                align="right" 
                                iconType="circle"
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="Bagus" 
                                stroke={COLORS.bagus} 
                                strokeWidth={3} 
                                dot={{ stroke: COLORS.bagus, strokeWidth: 2, r: 3, fill: 'white' }} 
                                activeDot={{ r: 5 }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="Layak Pakai" 
                                stroke={COLORS.layak_pakai} 
                                strokeWidth={3} 
                                dot={{ stroke: COLORS.layak_pakai, strokeWidth: 2, r: 3, fill: 'white' }} 
                                activeDot={{ r: 5 }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="Perlu Atensi" 
                                stroke={COLORS.perlu_atensi} 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={{ stroke: COLORS.perlu_atensi, strokeWidth: 2, r: 3, fill: 'white' }} 
                                activeDot={{ r: 5 }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="Tidak Bagus" 
                                stroke={COLORS.tidak_bagus} 
                                strokeWidth={2} 
                                strokeDasharray="5 5"
                                dot={{ stroke: COLORS.tidak_bagus, strokeWidth: 2, r: 3, fill: 'white' }} 
                                activeDot={{ r: 5 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Health Score</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-foreground">{goodPercent}%</span>
                            <span className="text-xs text-green-500 font-bold">Good Standing</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block uppercase tracking-widest font-bold mb-1">Total Monitoring</span>
                        <div className="flex items-center gap-2 justify-end">
                            <span className="text-2xl font-black text-foreground">{totalAssets}</span>
                            <span className="text-xs font-bold text-muted-foreground">Aset</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
