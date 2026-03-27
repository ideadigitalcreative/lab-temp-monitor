import { useState, useMemo, useRef } from 'react';
import { Header } from '@/components/Header';
import { RoomCard } from '@/components/RoomCard';
import { EquipmentCard } from '@/components/EquipmentCard';
import { TemperatureChart } from '@/components/TemperatureChart';
import { EquipmentTemperatureChart } from '@/components/EquipmentTemperatureChart';
import { StatCard } from '@/components/StatCard';
import { RoomFilter } from '@/components/RoomFilter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useRooms,
  useRoomsWithLatestReadings,
  useTemperatureLogs,
} from '@/hooks/useRooms';
import {
  useEquipment,
  useEquipmentWithLatestReadings,
  useEquipmentTemperatureLogs,
  type EquipmentWithLatestReading,
} from '@/hooks/useEquipment';
import { 
  useAllEquipmentWithLatestInspection, 
  useEquipmentInspections,
  type EquipmentInspection,
  getConditionInfo 
} from '@/hooks/useEquipmentInspection';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart,
  Line,
  BarChart,
  Bar 
} from 'recharts';
import { InspectionSummaryChart } from '@/components/InspectionSummaryChart';
import {
  Thermometer,
  Droplets,
  Building2,
  AlertTriangle,
  Loader2,
  Box,
  ClipboardCheck,
  FileText,
  X,
  User,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import html2canvas from 'html2canvas';

type TabValue = 'rooms' | 'equipment_temp' | 'equipment_inspection';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('rooms');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const equipChartRef = useRef<HTMLDivElement>(null);

  const { data: rooms, isLoading: roomsLoading } = useRooms();
  const { data: roomsWithReadings, isLoading: readingsLoading } = useRoomsWithLatestReadings();
  const { data: temperatureLogs, isLoading: logsLoading } = useTemperatureLogs(
    selectedRoom || undefined,
    dateRange?.from,
    dateRange?.to
  );

  const { data: equipment, isLoading: equipmentListLoading } = useEquipment();
  const { data: equipmentWithReadings, isLoading: equipmentReadingsLoading } = useEquipmentWithLatestReadings();
  const { data: equipmentLogs, isLoading: equipmentLogsLoading } = useEquipmentTemperatureLogs(
    selectedEquipment || undefined,
    dateRange?.from,
    dateRange?.to
  );
  const { data: equipmentInspection, isLoading: equipmentInspectionLoading } = useAllEquipmentWithLatestInspection();
  
  // Detail Logs for selected equipment
  const { data: singleEquipInspections, isLoading: singleEquipLoading } = useEquipmentInspections(
    selectedEquipment || undefined,
    dateRange?.from,
    dateRange?.to
  );

  // All Inspections for history trend
  const { data: allInspectionHistory, isLoading: allHistoryLoading } = useEquipmentInspections(
    undefined,
    dateRange?.from,
    dateRange?.to
  );

  const isLoading = roomsLoading || readingsLoading || equipmentListLoading || equipmentReadingsLoading || equipmentInspectionLoading || allHistoryLoading || singleEquipLoading;

  const stats = useMemo(() => {
    const latestRooms = roomsWithReadings.filter((r) => r.latestReading);
    const latestEquip = equipmentWithReadings.filter((e) => e.latestReading && e.type === 'temperature');

    const temps = [
      ...latestRooms.map((r) => r.latestReading!.temperature),
      ...latestEquip.map((e) => e.latestReading!.temperature)
    ];

    const inspectionWarnings = equipmentInspection?.filter(ei => ei.latestInspection?.condition === 'tidak_bagus').length || 0;

    const warnings =
      roomsWithReadings.filter((r) => r.status === 'warning' || r.status === 'critical').length +
      equipmentWithReadings.filter((e) => e.type === 'temperature' && (e.status === 'warning' || e.status === 'critical')).length +
      inspectionWarnings;

    return {
      avgTemp: temps.length
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        : '-',
      totalAssets: roomsWithReadings.length + (equipment?.length || 0),
      warnings,
    };
  }, [roomsWithReadings, equipmentWithReadings, equipmentInspection, equipment]);

  const displayedRooms = selectedRoom
    ? roomsWithReadings.filter((r) => r.id === selectedRoom)
    : roomsWithReadings;

  const tempEquipment = useMemo(() => {
    const base = equipmentWithReadings.filter(e => e.type === 'temperature');
    return selectedEquipment ? base.filter(e => e.id === selectedEquipment) : base;
  }, [equipmentWithReadings, selectedEquipment]);

  const inspectionEquipment = useMemo(() => {
    const base = equipmentWithReadings.filter(e => e.type === 'inspection');
    return selectedEquipment ? base.filter(e => e.id === selectedEquipment) : base;
  }, [equipmentWithReadings, selectedEquipment]);

  const selectedEquipInfo = useMemo(() => {
    if (!selectedEquipment || !equipmentInspection) return null;
    return (equipmentInspection as any[]).find(ei => ei.id === selectedEquipment);
  }, [selectedEquipment, equipmentInspection]);

  const chartData = useMemo(() => {
    return (temperatureLogs || []).map((log) => ({
      id: log.id,
      roomId: log.room_id,
      roomName: log.rooms?.name,
      temperature: log.temperature,
      humidity: log.humidity,
      recordedAt: new Date(log.recorded_at),
      recordedByName: log.profiles?.full_name || log.profiles?.email || 'System',
    }));
  }, [temperatureLogs]);

  const equipmentChartData = useMemo(() => {
    return (equipmentLogs || []).map((log) => ({
      id: log.id,
      roomId: log.equipment_id,
      roomName: log.equipment?.name,
      temperature: log.temperature,
      recordedAt: new Date(log.recorded_at),
      recordedByName: log.profiles?.full_name || log.profiles?.email || 'System',
    }));
  }, [equipmentLogs]);

  const handleDownloadPDF = async (equip: any) => {
    if (!equip) return;
    const toastId = toast.loading(`Menyiapkan laporan PDF untuk ${equip.name}...`);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Capture Chart if exists
      let chartImgData = null;
      if (equipChartRef.current) {
        try {
          // Temporarily ensure high quality capture
          const canvas = await html2canvas(equipChartRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          chartImgData = canvas.toDataURL('image/png');
        } catch (chartError) {
          console.error('Error capturing chart for PDF:', chartError);
        }
      }

      // Add a clean header box
      doc.setFillColor(249, 250, 251);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Load Logo
      try {
        const logoUrl = '/Logo-Labkesmas-Makassar-I.png';
        const img = new Image();
        img.src = logoUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 2000); // 2s timeout
        });
        doc.addImage(img, 'PNG', 10, 8, 45, 12);
      } catch (e) {
        console.error('Logo failed to load', e);
      }
      
      // Header Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text('LABORATORIUM PENGUJI', pageWidth - 10, 12, { align: 'right' });
      doc.setFontSize(9);
      doc.text('LABORATORIUM KESEHATAN MASYARAKAT', pageWidth - 10, 17, { align: 'right' });
      doc.setFontSize(10);
      doc.text('MAKASSAR II', pageWidth - 10, 22, { align: 'right' });
      
      doc.setDrawColor(229, 231, 235);
      doc.line(10, 30, pageWidth - 10, 30);
      
      // Title
      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.text('REKAMAN PEMELIHARAAN & PEMERIKSAAN ALAT', pageWidth / 2, 45, { align: 'center' });
      
      // Asset Details Card-like section
      doc.setDrawColor(209, 213, 219);
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(10, 52, pageWidth - 20, 22, 1, 1, 'FD');
      
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('Informasi Alat:', 15, 59);
      doc.text('Periode Laporan:', pageWidth - 15, 59, { align: 'right' });
      
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text(equip.name, 15, 66);
      doc.text(equip.location || '-', 15, 71);
      
      const pText = dateRange?.from ? 
        `${format(dateRange.from, 'dd MMM yyyy', { locale: idLocale })} - ${dateRange.to ? format(dateRange.to, 'dd MMM yyyy', { locale: idLocale }) : format(new Date(), 'dd MMM yyyy', { locale: idLocale })}` 
        : format(new Date(), 'MMMM yyyy', { locale: idLocale });
      doc.text(pText, pageWidth - 15, 66, { align: 'right' });
      
      let y = 80;

      // Add Chart to PDF if captured
      if (chartImgData) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('TREN KELAYAKAN FISIK (GRAFIK):', 10, y);
        y += 4;
        
        const chartWidth = pageWidth - 20;
        const chartHeight = 45; // Fixed height for consistency
        doc.addImage(chartImgData, 'PNG', 10, y, chartWidth, chartHeight);
        y += chartHeight + 10;
      }

      // Table Header
      doc.setFillColor(37, 99, 235);
      doc.rect(10, y, pageWidth - 20, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('Waktu Pemeriksaan', 15, y + 6.5);
      doc.text('Kondisi', 65, y + 6.5);
      doc.text('Catatan', 100, y + 6.5);
      doc.text('Petugas', pageWidth - 15, y + 6.5, { align: 'right' });
      
      // Table Content
      y += 10;
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      const inspections = singleEquipInspections || [];
      if (inspections.length === 0) {
        doc.text('Tidak ada data pemeriksaan untuk periode ini.', pageWidth / 2, y + 15, { align: 'center' });
        y += 20;
      } else {
        inspections.forEach((log, index) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
            // Draw mini header for new page
            doc.setFillColor(37, 99, 235);
            doc.rect(10, y, pageWidth - 20, 10, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text('Waktu Pemeriksaan', 15, y + 6.5);
            doc.text('Kondisi', 65, y + 6.5);
            doc.text('Catatan', 100, y + 6.5);
            doc.text('Petugas', pageWidth - 15, y + 6.5, { align: 'right' });
            y += 10;
            doc.setTextColor(31, 41, 55);
            doc.setFont('helvetica', 'normal');
          }
          
          // Zebra striping
          if (index % 2 === 1) {
            doc.setFillColor(249, 250, 251);
            doc.rect(10, y, pageWidth - 20, 9, 'F');
          }
          
          doc.setDrawColor(243, 244, 246);
          doc.line(10, y + 9, pageWidth - 10, y + 9);
          
          doc.text(format(new Date(log.inspected_at), 'dd/MM/yyyy HH:mm'), 15, y + 6);
          
          const conditionText = log.condition === 'bagus' ? 'BAGUS' : 'TIDAK BAGUS';
          if (conditionText === 'BAGUS') doc.setTextColor(22, 163, 74);
          else doc.setTextColor(220, 38, 38);
          doc.setFont('helvetica', 'bold');
          doc.text(conditionText, 65, y + 6);
          
          doc.setTextColor(31, 41, 55);
          doc.setFont('helvetica', 'normal');
          
          let notes = log.notes || '-';
          if (notes.length > 50) notes = notes.substring(0, 47) + '...';
          doc.text(notes, 100, y + 6);
          
          let inspector = log.profiles?.full_name || log.profiles?.email || '-';
          if (inspector.length > 30) inspector = inspector.substring(0, 27) + '...';
          doc.text(inspector, pageWidth - 15, y + 6, { align: 'right' });
          
          y += 9;
        });
      }
      
      // Signatures & Footer
      y = Math.min(y + 15, 240);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      doc.text('Paraf Verifikasi:', 15, y);
      doc.setDrawColor(209, 213, 219);
      doc.rect(15, y + 3, 45, 20);
      
      y += 35;
      doc.setFont('helvetica', 'bold');
      doc.text('EVALUASI :', 15, y);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('(Diisi oleh Penanggung Jawab Ruangan/Laboratorium)', 35, y);
      
      doc.setDrawColor(209, 213, 219);
      doc.rect(15, y + 3, pageWidth - 30, 15);
      
      // Final metadata sticky to bottom
      const footerY = 285;
      doc.setDrawColor(107, 114, 128);
      doc.setLineWidth(0.1);
      doc.line(10, footerY - 5, pageWidth - 10, footerY - 5);
      
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text('Edisi: IV | Revisi: 0 | Halaman: 1/1', 15, footerY);
      doc.text(`Dokumen: F/BLKM-MKS/6.3/01/00/01 | Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 15, footerY, { align: 'right' });
      
      doc.save(`Laporan_Alat_${equip.name.replace(/\s+/g, '_')}.pdf`);
      toast.success('Laporan PDF berhasil diunduh', { id: toastId });
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Gagal mengunduh laporan PDF', { id: toastId });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Monitoring Lab & Equipment
          </h1>
          <p className="text-muted-foreground">
            Pemantauan suhu dan kelembaban real-time untuk ruangan dan perangkat laboratorium
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Memuat data...</span>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                title="Rata-rata Suhu"
                value={`${stats.avgTemp}°C`}
                icon={<Thermometer className="w-4 h-4 md:w-5 md:h-5" />}
                iconClassName="text-orange-500 bg-orange-500/10"
              />
              <StatCard
                title="Total Area & Alat"
                value={stats.totalAssets}
                icon={<Building2 className="w-4 h-4 md:w-5 md:h-5" />}
                iconClassName="text-violet-500 bg-violet-500/10"
              />
              <StatCard
                title="Perlu Perhatian"
                value={stats.warnings}
                icon={<AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />}
                className={stats.warnings > 0 ? 'border-status-warning' : ''}
                iconClassName={stats.warnings > 0 ? "text-orange-500 bg-orange-500/10" : "text-green-500 bg-green-500/10"}
              />
            </div>

            <Tabs value={activeTab} className="w-full space-y-6" onValueChange={(v) => {
              setActiveTab(v as TabValue);
              setSelectedEquipment(null);
              setSelectedRoom(null);
            }}>
              <div className="flex justify-center">
                <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-secondary/30 p-1 border border-border/50 rounded-xl backdrop-blur-sm h-12">
                  <TabsTrigger
                    value="rooms"
                    className="gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30"
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Monitoring</span> Ruangan
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipment_temp"
                    className="gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30"
                  >
                    <Thermometer className="w-4 h-4" />
                    Suhu Alat
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipment_inspection"
                    className="gap-2 rounded-lg transition-all duration-300 data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-600/30"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    Pemeriksaan <span className="hidden sm:inline">Fisik</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="rooms" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Monitoring Ruangan</h2>
                </div>

                {/* Chart Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Grafik Tren Ruangan</h3>
                  {chartData.length > 0 ? (
                    <TemperatureChart
                      data={chartData.slice(-50)}
                      sourceData={chartData}
                      title={
                        selectedRoom
                          ? `Visualisasi ${rooms?.find((r) => r.id === selectedRoom)?.name}`
                          : 'Grafik Suhu & Kelembaban (Semua Ruangan)'
                      }
                    />
                  ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                      <p>Belum ada data rekaman untuk periode ini</p>
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="glass-card rounded-xl p-4">
                  <RoomFilter
                    rooms={rooms || []}
                    selectedRoom={selectedRoom}
                    dateRange={dateRange}
                    onRoomChange={setSelectedRoom}
                    onDateRangeChange={setDateRange}
                  />
                </div>

                {/* Room Cards Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Kondisi Saat Ini</h3>
                  {displayedRooms.length > 0 ? (
                    <div
                      className={
                        displayedRooms.length === 7
                          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4"
                          : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                      }
                    >
                      {displayedRooms.map((room, index) => (
                        <div
                          key={room.id}
                          className={
                            displayedRooms.length === 7
                              ? (index < 3 ? "lg:col-span-4" : "lg:col-span-3")
                              : ""
                          }
                        >
                          <RoomCard
                            room={room}
                            onClick={() => setSelectedRoom(room.id)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada ruangan ditemukan
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="equipment_temp" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Monitoring Suhu Peralatan</h2>
                </div>

                {/* Temperature Chart Section - 3 garis: Pagi, Siang, Sore */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Grafik Suhu Alat</h3>
                  {equipmentChartData.length > 0 ? (
                    <EquipmentTemperatureChart
                      data={equipmentChartData}
                      sourceData={equipmentChartData}
                      title={
                        selectedEquipment
                          ? `Grafik ${equipment?.find((e) => e.id === selectedEquipment)?.name} (Pagi / Siang / Sore)`
                          : 'Grafik Suhu Alat'
                      }
                    />
                  ) : (
                    <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
                      <p>Belum ada data suhu alat untuk periode ini</p>
                    </div>
                  )}
                </div>

                {/* Filters */}
                <div className="glass-card rounded-xl p-4">
                  <RoomFilter
                    rooms={equipment?.filter(e => e.type === 'temperature').map(e => ({ ...e, location: e.location })) || []}
                    selectedRoom={selectedEquipment}
                    dateRange={dateRange}
                    onRoomChange={setSelectedEquipment}
                    onDateRangeChange={setDateRange}
                    searchPlaceholder="Cari alat..."
                    selectPlaceholder="Pilih Alat"
                  />
                </div>

                {/* List Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Daftar Alat Suhu</h3>
                  {tempEquipment.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tempEquipment.map((item) => {
                        const inspectionInfo = equipmentInspection?.find(ei => ei.id === item.id);
                        return (
                          <EquipmentCard
                            key={item.id}
                            equipment={{
                              ...item,
                              latestInspection: inspectionInfo?.latestInspection
                            } as EquipmentWithLatestReading & { latestInspection?: EquipmentInspection }}
                            onClick={() => setSelectedEquipment(item.id)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada alat suhu ditemukan
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="equipment_inspection" className="space-y-8 animate-fade-in">
                {/* Section Title */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <h2 className="text-xl font-bold">Pemeriksaan Kondisi Alat</h2>
                    </div>
                  </div>
                {/* Inspection Analysis Section */}
                {equipmentInspection && equipmentInspection.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                        {selectedEquipment 
                          ? `Analisis Riwayat: ${equipment?.find(e => e.id === selectedEquipment)?.name}`
                          : "Analisis Kelayakan Aset"}
                      </h3>
                      {selectedEquipment && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDownloadPDF(selectedEquipInfo)}
                            className="text-xs h-7 gap-1 bg-white hover:bg-red-50 text-red-600 border-red-200"
                          >
                            <FileText className="w-3 h-3" /> Download PDF
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedEquipment(null)}
                            className="text-xs h-7 gap-1"
                          >
                            <X className="w-3 h-3" /> Kembali ke Semua
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className={cn(selectedEquipment ? "md:col-span-1" : "md:col-span-3")}>
                        {selectedEquipment ? (
                          <Card className="glass-card border-none h-full bg-secondary/20">
                            <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[220px]">
                              {singleEquipInspections && singleEquipInspections.length > 0 ? (
                                <>
                                  <div ref={equipChartRef} className="h-[200px] w-full mt-2 bg-white rounded-lg p-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart
                                        data={[...singleEquipInspections].reverse().map(log => ({
                                          date: format(new Date(log.inspected_at), 'dd/MM', { locale: idLocale }),
                                          fullDate: format(new Date(log.inspected_at), 'dd MMM yyyy, HH:mm', { locale: idLocale }),
                                          condition: log.condition,
                                          score: log.condition === 'bagus' ? 1 : 0
                                        }))}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                      >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                                        <XAxis dataKey="date" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                                        <YAxis domain={[0, 1]} ticks={[0, 1]} hide />
                                        <RechartsTooltip 
                                          content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                              const data = payload[0].payload;
                                              const info = getConditionInfo(data.condition);
                                              return (
                                                <div className="bg-background border border-border/50 rounded-lg p-2 shadow-xl text-[10px]">
                                                  <p className="font-bold text-muted-foreground mb-1">{data.fullDate}</p>
                                                  <div className="flex items-center gap-2">
                                                    <div className={cn("w-2 h-2 rounded-full", info.bgColor.replace('bg-', 'bg-opacity-100 bg-'))} />
                                                    <span className="font-bold uppercase tracking-tight">{info.label}</span>
                                                  </div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          }}
                                        />
                                        <Line 
                                          type="monotone" 
                                          dataKey="score" 
                                          stroke="hsl(var(--primary))" 
                                          strokeWidth={2} 
                                          dot={(props: any) => {
                                            const { cx, cy, payload } = props;
                                            const info = getConditionInfo(payload.condition);
                                            const color = info.bgColor.replace('bg-', '').replace('-100', '-500');
                                            return <circle cx={cx} cy={cy} r={4} fill={`var(--${color}, ${info.color.includes('green') ? '#10b981' : info.color.includes('blue') ? '#3b82f6' : info.color.includes('red') ? '#ef4444' : '#f97316'})`} strokeWidth={0} />;
                                          }}
                                          activeDot={{ r: 5, strokeWidth: 0 }}
                                          animationDuration={1000}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                  <div className="text-center mt-4">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/30 px-3 py-1 rounded-full border border-border/50">Tren Kelayakan Fisik</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center text-muted-foreground py-8">
                                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-20" />
                                  <span className="text-xs">Memuat riwayat...</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ) : (
                          <InspectionSummaryChart
                            data={equipmentInspection}
                            historyData={allInspectionHistory}
                            dateRange={dateRange}
                            className="h-full min-h-[400px]"
                          />
                        )}
                      </div>

                      {selectedEquipment && (
                        <div className="md:col-span-2 glass-card rounded-xl p-8 flex flex-col justify-center">
                          <div className="space-y-4 h-full">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-lg font-bold mb-1">Status Terakhir</h4>
                                {selectedEquipInfo?.latestInspection ? (
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "px-2 py-0.5 rounded font-bold uppercase", 
                                        getConditionInfo(selectedEquipInfo.latestInspection.condition).bgColor, 
                                        getConditionInfo(selectedEquipInfo.latestInspection.condition).color
                                      )}>
                                        {getConditionInfo(selectedEquipInfo.latestInspection.condition).label}
                                      </div>
                                      <span className="text-muted-foreground">
                                        {format(new Date(selectedEquipInfo.latestInspection.inspected_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground bg-secondary/30 px-2 py-1 rounded-md w-fit">
                                      <User className="w-3 h-3" />
                                      <span className="font-medium">Petugas: {selectedEquipInfo.latestInspection.profiles?.full_name || '-'}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Belum ada riwayat update</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Simple timeline or latest notes */}
                            <div className="bg-secondary/30 rounded-lg p-4 flex-1">
                              <h5 className="text-xs font-bold mb-2 uppercase tracking-tight text-muted-foreground font-mono flex items-center gap-1.5 opacity-70">
                                <Clock className="w-3 h-3" /> Catatan Terakhir:
                              </h5>
                              <p className="text-sm italic text-foreground/90 bg-background/50 p-2 rounded border border-border/30">
                                {selectedEquipInfo?.latestInspection?.notes || "Tidak ada catatan untuk pemeriksaan terakhir."}
                              </p>
                              {selectedEquipInfo?.latestInspection && (
                                <div className="mt-4 pt-4 border-t border-border/50">
                                  <h5 className="text-[10px] font-bold mb-2 uppercase tracking-wider text-muted-foreground">Riwayat di Periode Terpilih:</h5>
                                  <div className="flex gap-2">
                                    {singleEquipInspections && singleEquipInspections.length > 0 ? (
                                      singleEquipInspections.slice(0, 5).map((log, idx) => (
                                        <div key={idx} className={cn("w-3 h-3 rounded-full shadow-sm", getConditionInfo(log.condition).bgColor.replace('bg-', 'bg-opacity-100 bg-'))} title={log.notes || ''} />
                                      ))
                                    ) : (
                                      <span className="text-[10px] italic text-muted-foreground">Tidak ada riwayat untuk periode filter ini</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="glass-card rounded-xl p-4">
                  <RoomFilter
                    rooms={equipment?.filter(e => e.type === 'inspection').map(e => ({ ...e, location: e.location })) || []}
                    selectedRoom={selectedEquipment}
                    dateRange={dateRange}
                    onRoomChange={setSelectedEquipment}
                    onDateRangeChange={setDateRange}
                    searchPlaceholder="Cari alat..."
                    selectPlaceholder="Pilih Alat"
                  />
                </div>


                {/* List Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">Daftar Alat Pemeriksaan</h3>
                  {inspectionEquipment.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {equipmentInspection?.map((item) => (
                        <EquipmentCard
                          key={item.id}
                          equipment={item}
                          onClick={() => setSelectedEquipment(item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Tidak ada alat pemeriksaan ditemukan
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>LabTemp Monitoring System © {new Date().getFullYear()}</p>
          <p className="text-xs mt-1">
            Dashboard publik untuk pemantauan suhu laboratorium
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
