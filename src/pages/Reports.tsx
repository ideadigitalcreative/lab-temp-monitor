import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, FileSpreadsheet, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Reports() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        to: new Date(),
    });
    const [includeRooms, setIncludeRooms] = useState(true);
    const [includeEquipment, setIncludeEquipment] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const isMobile = useIsMobile();

    const handleExport = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast.error('Silakan pilih rentang tanggal terlebih dahulu');
            return;
        }

        if (!includeRooms && !includeEquipment) {
            toast.error('Silakan pilih setidaknya satu jenis data (Ruangan atau Alat)');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading('Sedang mengunduh data...');

        try {
            const wb = XLSX.utils.book_new();
            let hasData = false;

            // Prepare data containers
            let roomLogsData: any[] = [];
            let equipLogsData: any[] = [];
            const userIds = new Set<string>();

            // Fetch Room Data
            if (includeRooms) {
                const { data: roomLogs, error: roomError } = await supabase
                    .from('temperature_logs')
                    .select(`
            *,
            rooms (
              name,
              location
            )
          `)
                    .gte('recorded_at', dateRange.from.toISOString())
                    .lte('recorded_at', dateRange.to.toISOString())
                    .order('recorded_at', { ascending: false });

                if (roomError) throw roomError;

                if (roomLogs && roomLogs.length > 0) {
                    roomLogsData = roomLogs;
                    roomLogs.forEach(log => {
                        if (log.recorded_by) userIds.add(log.recorded_by);
                    });
                }
            }

            // Fetch Equipment Data
            if (includeEquipment) {
                const { data: equipmentLogs, error: equipError } = await supabase
                    .from('equipment_temperature_logs')
                    .select(`
            *,
            equipment (
              name,
              location
            )
          `)
                    .gte('recorded_at', dateRange.from.toISOString())
                    .lte('recorded_at', dateRange.to.toISOString())
                    .order('recorded_at', { ascending: false });

                if (equipError) throw equipError;

                if (equipmentLogs && equipmentLogs.length > 0) {
                    equipLogsData = equipmentLogs;
                    equipmentLogs.forEach(log => {
                        if (log.recorded_by) userIds.add(log.recorded_by);
                    });
                }
            }

            // Fetch User Profiles
            const userMap = new Map<string, string>();
            if (userIds.size > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, email, full_name') // Select full_name
                    .in('id', Array.from(userIds));

                if (!profilesError && profiles) {
                    profiles.forEach(p => {
                        userMap.set(p.id, p.full_name || p.email); // Prefer full_name
                    });
                }
            }

            // Process Room Data
            if (roomLogsData.length > 0) {
                hasData = true;
                const roomData = roomLogsData.map(log => ({
                    'Waktu': format(new Date(log.recorded_at), 'dd/MM/yyyy HH:mm:ss', { locale: id }),
                    'Ruangan': log.rooms?.name || 'Unknown',
                    'Lokasi': log.rooms?.location || '-',
                    'Suhu (°C)': log.temperature,
                    'Kelembaban (%)': log.humidity,
                    'Direkam Oleh': (log.recorded_by && userMap.get(log.recorded_by)) || log.recorded_by || '-'
                }));

                const wsRooms = XLSX.utils.json_to_sheet(roomData);

                // Auto-width columns
                const wscols = [
                    { wch: 20 }, // Waktu
                    { wch: 25 }, // Ruangan
                    { wch: 20 }, // Lokasi
                    { wch: 10 }, // Suhu
                    { wch: 15 }, // Kelembaban
                    { wch: 30 }, // Direkam Oleh
                ];
                wsRooms['!cols'] = wscols;

                XLSX.utils.book_append_sheet(wb, wsRooms, "Data Ruangan");
            }

            // Process Equipment Data
            if (equipLogsData.length > 0) {
                hasData = true;
                const equipData = equipLogsData.map(log => ({
                    'Waktu': format(new Date(log.recorded_at), 'dd/MM/yyyy HH:mm:ss', { locale: id }),
                    'Nama Alat': log.equipment?.name || 'Unknown',
                    'Lokasi': log.equipment?.location || '-',
                    'Suhu (°C)': log.temperature,
                    'Direkam Oleh': (log.recorded_by && userMap.get(log.recorded_by)) || log.recorded_by || '-'
                }));

                const wsEquip = XLSX.utils.json_to_sheet(equipData);

                // Auto-width columns
                const wscols = [
                    { wch: 20 }, // Waktu
                    { wch: 25 }, // Nama Alat
                    { wch: 20 }, // Lokasi
                    { wch: 10 }, // Suhu
                    { wch: 30 }, // Direkam Oleh
                ];
                wsEquip['!cols'] = wscols;

                XLSX.utils.book_append_sheet(wb, wsEquip, "Data Alat");
            }

            if (!hasData) {
                toast.dismiss(toastId);
                toast.info('Tidak ada data ditemukan pada rentang tanggal tersebut');
                return;
            }

            // Generate filename
            const filename = `Laporan_Suhu_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
            XLSX.writeFile(wb, filename);

            toast.dismiss(toastId);
            toast.success('Laporan berhasil diunduh');
        } catch (error) {
            console.error('Export error:', error);
            toast.dismiss(toastId);
            toast.error('Gagal mengunduh laporan');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Laporan Data</h1>
                    <p className="text-muted-foreground">
                        Bikin laporan dan unduh data pengukuran suhu ruangan dan peralatan laboratorium.
                    </p>
                </div>

                <Card className="glass-card border-border/50">
                    <CardHeader>
                        <CardTitle>Export Data</CardTitle>
                        <CardDescription>
                            Pilih data yang ingin diunduh dalam format Excel.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Filter Tanggal */}
                        <div className="space-y-2">
                            <Label>Rentang Tanggal</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                    {format(dateRange.from, "d MMMM yyyy", { locale: id })} -{" "}
                                                    {format(dateRange.to, "d MMMM yyyy", { locale: id })}
                                                </>
                                            ) : (
                                                format(dateRange.from, "d MMMM yyyy", { locale: id })
                                            )
                                        ) : (
                                            <span>Pilih periode tanggal</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        initialFocus
                                        mode="range"
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        numberOfMonths={isMobile ? 1 : 2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Filter Jenis Data */}
                        <div className="space-y-3">
                            <Label>Jenis Data</Label>
                            <div className="flex gap-6">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="rooms"
                                        checked={includeRooms}
                                        onCheckedChange={(c) => setIncludeRooms(c as boolean)}
                                    />
                                    <Label htmlFor="rooms" className="cursor-pointer font-normal">Data Ruangan</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="equipment"
                                        checked={includeEquipment}
                                        onCheckedChange={(c) => setIncludeEquipment(c as boolean)}
                                    />
                                    <Label htmlFor="equipment" className="cursor-pointer font-normal">Data Peralatan</Label>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4">
                            <Button
                                className="w-full sm:w-auto min-w-[200px]"
                                size="lg"
                                onClick={handleExport}
                                disabled={isExporting}
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sedang Mengunduh...
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Download Excel
                                    </>
                                )}
                            </Button>
                        </div>

                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
