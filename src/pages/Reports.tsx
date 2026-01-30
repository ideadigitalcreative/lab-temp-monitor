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
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Reports() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        to: new Date(),
    });
    const [includeRooms, setIncludeRooms] = useState(true);
    const [includeEquipment, setIncludeEquipment] = useState(true);
    const [includeInspections, setIncludeInspections] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const isMobile = useIsMobile();

    const handleExport = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast.error('Silakan pilih rentang tanggal terlebih dahulu');
            return;
        }

        if (!includeRooms && !includeEquipment && !includeInspections) {
            toast.error('Silakan pilih setidaknya satu jenis data (Ruangan, Alat, atau Pemeriksaan)');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading('Sedang menyiapkan laporan profesional...');

        try {
            // Load Logo
            let logoBuffer: ArrayBuffer | null = null;
            try {
                const response = await fetch('/Logo-Labkesmas-Makassar-I.png');
                if (response.ok) {
                    logoBuffer = await response.arrayBuffer();
                }
            } catch (e) {
                console.error('Failed to load logo', e);
            }

            const workbook = new ExcelJS.Workbook();
            let hasData = false;

            // Prepare data containers
            let roomLogsData: any[] = [];
            let equipLogsData: any[] = [];
            let inspectionsData: any[] = [];
            const userIds = new Set<string>();

            // Fetching Data
            if (includeRooms) {
                const { data: roomLogs, error: roomError } = await supabase
                    .from('temperature_logs')
                    .select('*, rooms(name, location)')
                    .gte('recorded_at', dateRange.from.toISOString())
                    .lte('recorded_at', dateRange.to.toISOString())
                    .order('recorded_at', { ascending: false });
                if (!roomError && roomLogs) {
                    roomLogsData = roomLogs;
                    roomLogs.forEach(log => log.recorded_by && userIds.add(log.recorded_by));
                }
            }

            if (includeEquipment) {
                const { data: equipmentLogs, error: equipError } = await supabase
                    .from('equipment_temperature_logs')
                    .select('*, equipment(name, location)')
                    .gte('recorded_at', dateRange.from.toISOString())
                    .lte('recorded_at', dateRange.to.toISOString())
                    .order('recorded_at', { ascending: false });
                if (!equipError && equipmentLogs) {
                    equipLogsData = equipmentLogs;
                    equipmentLogs.forEach(log => log.recorded_by && userIds.add(log.recorded_by));
                }
            }

            if (includeInspections) {
                const { data: inspections, error: inspectionError } = await (supabase as any)
                    .from('equipment_inspections')
                    .select('*, equipment(name, location)')
                    .gte('inspected_at', dateRange.from.toISOString())
                    .lte('inspected_at', dateRange.to.toISOString())
                    .order('inspected_at', { ascending: false });
                if (!inspectionError && inspections) {
                    inspectionsData = inspections;
                    inspections.forEach((log: any) => log.inspected_by && userIds.add(log.inspected_by));
                }
            }

            const userMap = new Map<string, string>();
            if (userIds.size > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('id', Array.from(userIds));
                profiles?.forEach(p => userMap.set(p.id, p.full_name || p.email));
            }

            const monthYear = format(dateRange.from, 'MMMM yyyy', { locale: id });

            const applySheetStyle = (sheet: ExcelJS.Worksheet, columns: Partial<ExcelJS.Column>[], title: string, assetLabel: string, assetName: string) => {
                sheet.columns = columns;

                // Add Logo if exists
                if (logoBuffer) {
                    const logoId = workbook.addImage({
                        buffer: logoBuffer,
                        extension: 'png',
                    });
                    sheet.addImage(logoId, {
                        tl: { col: 0.1, row: 0.1 },
                        ext: { width: 160, height: 50 }
                    });
                }

                // Header Makassar Section
                sheet.mergeCells(1, 4, 1, columns.length);
                const h1 = sheet.getCell(1, 4);
                h1.value = 'LABORATORIUM PENGUJI';
                h1.font = { bold: true, size: 12 };
                h1.alignment = { horizontal: 'right' };

                sheet.mergeCells(2, 4, 2, columns.length);
                const h2 = sheet.getCell(2, 4);
                h2.value = 'LABORATORIUM KESEHATAN MASYARAKAT';
                h2.font = { bold: true, size: 11 };
                h2.alignment = { horizontal: 'right' };

                sheet.mergeCells(3, 4, 3, columns.length);
                const h3 = sheet.getCell(3, 4);
                h3.value = 'MAKASSAR II';
                h3.font = { bold: true, size: 12 };
                h3.alignment = { horizontal: 'right' };

                // Main Title
                sheet.mergeCells(5, 1, 5, columns.length);
                const titleCell = sheet.getCell(5, 1);
                titleCell.value = title.toUpperCase();
                titleCell.font = { bold: true, size: 14 };
                titleCell.alignment = { horizontal: 'center' };
                titleCell.border = { bottom: { style: 'thin' } };

                // Asset & Month Info
                sheet.mergeCells(6, 1, 6, 3);
                sheet.getCell(6, 1).value = `${assetLabel} : ${assetName}`;
                sheet.getCell(6, 1).font = { bold: true };

                sheet.mergeCells(6, columns.length - 1, 6, columns.length);
                sheet.getCell(6, columns.length - 1).value = `Bulan : ${monthYear}`;
                sheet.getCell(6, columns.length - 1).font = { bold: true };
                sheet.getCell(6, columns.length - 1).alignment = { horizontal: 'right' };

                return 8; // Table starts at row 8
            };

            const addTableWithBorders = (sheet: ExcelJS.Worksheet, startRow: number, headers: string[], rows: any[][]) => {
                const headerRow = sheet.getRow(startRow);
                headerRow.values = headers;
                headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
                headerRow.height = 25;

                headerRow.eachCell(cell => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF2563EB' } // Blue primary
                    };
                });

                rows.forEach((rowData, index) => {
                    const row = sheet.getRow(startRow + 1 + index);
                    row.values = rowData;
                    row.height = 20;
                    row.eachCell({ includeEmpty: true }, cell => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    });
                });

                return startRow + rows.length + 1;
            };

            const addFooter = (sheet: ExcelJS.Worksheet, startRow: number, tableWidth: number) => {
                let row = startRow + 1;
                sheet.getCell(row, 1).value = 'Evaluasi :';
                sheet.getCell(row, 1).font = { bold: true };

                sheet.mergeCells(row + 1, 1, row + 4, tableWidth);
                sheet.getCell(row + 1, 1).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                sheet.getCell(row + 1, 1).alignment = { vertical: 'top' };

                row += 6;
                sheet.getCell(row, 1).value = 'Catatan :';
                sheet.getCell(row, 1).font = { bold: true };
                sheet.getCell(row + 1, 1).value = 'Batas Keberterimaan';
                sheet.getCell(row + 2, 1).value = 'Temperatur: ±3°C';

                row += 4;
                // Final Metadata Box
                const metaStartRow = row;

                sheet.getCell(row, 1).value = 'Edisi / Revisi';
                sheet.getCell(row, 2).value = ': IV / 0';
                sheet.mergeCells(row, tableWidth - 1, row, tableWidth);
                sheet.getCell(row, tableWidth - 1).value = 'F/BLKM-MKS/6.3/01/00/01';
                sheet.getCell(row, tableWidth - 1).alignment = { horizontal: 'right' };

                row++;
                sheet.getCell(row, 1).value = 'Tanggal Berlaku';
                sheet.getCell(row, 2).value = `: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`;

                row++;
                sheet.getCell(row, 1).value = 'Halaman';
                sheet.getCell(row, 2).value = ': 1/1';

                // Add stylized border to meta section
                for (let r = metaStartRow; r <= row; r++) {
                    const rObj = sheet.getRow(r);
                    rObj.font = { size: 9, italic: true };
                }
            };

            if (roomLogsData.length > 0) {
                hasData = true;
                const ws = workbook.addWorksheet('Laporan Ruangan');
                const cols = [
                    { width: 25 }, { width: 30 }, { width: 30 }, { width: 15 }, { width: 15 }, { width: 35 }
                ];
                const startRow = applySheetStyle(ws, cols, "Rekaman Penyimpanan Spesimen Dan Reagensia", "Nama Ruangan", "Semua Ruangan");
                const headers = ["Waktu", "Ruangan", "Lokasi", "Suhu (°C)", "RH (%)", "Petugas"];
                const rows = roomLogsData.map(log => [
                    format(new Date(log.recorded_at), 'dd/MM/yyyy HH:mm', { locale: id }),
                    log.rooms?.name || '-',
                    log.rooms?.location || '-',
                    log.temperature,
                    log.humidity,
                    userMap.get(log.recorded_by || '') || '-'
                ]);
                const nextRow = addTableWithBorders(ws, startRow, headers, rows);
                addFooter(ws, nextRow, headers.length);
            }

            if (equipLogsData.length > 0) {
                hasData = true;
                const ws = workbook.addWorksheet('Suhu Alat');
                const cols = [
                    { width: 25 }, { width: 35 }, { width: 30 }, { width: 15 }, { width: 35 }
                ];
                const startRow = applySheetStyle(ws, cols, "Rekaman Penyimpanan Spesimen Dan Reagensia", "Nama Alat", "Semua Alat");
                const headers = ["Waktu", "Nama Alat", "Lokasi", "Suhu (°C)", "Petugas"];
                const rows = equipLogsData.map(log => [
                    format(new Date(log.recorded_at), 'dd/MM/yyyy HH:mm', { locale: id }),
                    log.equipment?.name || '-',
                    log.equipment?.location || '-',
                    log.temperature,
                    userMap.get(log.recorded_by || '') || '-'
                ]);
                const nextRow = addTableWithBorders(ws, startRow, headers, rows);
                addFooter(ws, nextRow, headers.length);
            }

            if (inspectionsData.length > 0) {
                hasData = true;
                const ws = workbook.addWorksheet('Pemeriksaan Alat');
                const cols = [
                    { width: 25 }, { width: 35 }, { width: 30 }, { width: 20 }, { width: 40 }, { width: 35 }
                ];
                const startRow = applySheetStyle(ws, cols, "Rekaman Pemeliharaan & Pemeriksaan Alat", "Nama Alat", "Semua Alat");
                const headers = ["Waktu", "Nama Alat", "Lokasi", "Kondisi", "Catatan", "Petugas"];
                const rows = inspectionsData.map(log => [
                    format(new Date(log.inspected_at), 'dd/MM/yyyy HH:mm', { locale: id }),
                    log.equipment?.name || '-',
                    log.equipment?.location || '-',
                    log.condition === 'bagus' ? 'Bagus' : 'Tidak Bagus',
                    log.notes || '-',
                    userMap.get(log.inspected_by || '') || '-'
                ]);
                const nextRow = addTableWithBorders(ws, startRow, headers, rows);
                addFooter(ws, nextRow, headers.length);
            }

            if (!hasData) {
                toast.dismiss(toastId);
                toast.info('Tidak ada data ditemukan pada rentang tanggal tersebut');
                return;
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Laporan_Lab_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);

            toast.dismiss(toastId);
            toast.success('Laporan profesional berhasil diunduh');
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
                <div className="mb-8 text-center sm:text-left">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Laporan Data</h1>
                    <p className="text-muted-foreground">
                        Bikin laporan profesional sesuai standar Kemenkes untuk pemantauan lab.
                    </p>
                </div>

                <Card className="glass-card border-border/50 overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                            Export Laporan Profesional
                        </CardTitle>
                        <CardDescription>
                            Pilih periode dan jenis data. Laporan akan otomatis menyertakan Header & Footer resmi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">

                        {/* Filter Tanggal */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Rentang Tanggal</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-11",
                                            !dateRange && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
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
                            <Label className="text-sm font-semibold">Komponen Laporan</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-secondary/30 p-4 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="rooms"
                                        checked={includeRooms}
                                        onCheckedChange={(c) => setIncludeRooms(c as boolean)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="rooms" className="cursor-pointer font-medium text-sm">Data Ruangan</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="equipment"
                                        checked={includeEquipment}
                                        onCheckedChange={(c) => setIncludeEquipment(c as boolean)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="equipment" className="cursor-pointer font-medium text-sm">Suhu Peralatan</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="inspections"
                                        checked={includeInspections}
                                        onCheckedChange={(c) => setIncludeInspections(c as boolean)}
                                        className="data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="inspections" className="cursor-pointer font-medium text-sm">Pemeriksaan Fisik</Label>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4">
                            <Button
                                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
                                size="lg"
                                onClick={handleExport}
                                disabled={isExporting}
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Mempersiapkan File...
                                    </>
                                ) : (
                                    <>
                                        <FileSpreadsheet className="mr-2 h-5 w-5" />
                                        Unduh Laporan Professional (.xlsx)
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
