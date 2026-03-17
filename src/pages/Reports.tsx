import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, FileSpreadsheet, Loader2, Building2, Thermometer, ClipboardCheck, LayoutGrid, List, Info } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function Reports() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
        to: new Date(),
    });
    const [includeRooms, setIncludeRooms] = useState(true);
    const [includeEquipment, setIncludeEquipment] = useState(true);
    const [includeInspections, setIncludeInspections] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('full');
    const [assetSubTab, setAssetSubTab] = useState('equip');
    const isMobile = useIsMobile();
    
    // Preview state
    const [previewAsset, setPreviewAsset] = useState<{ id: string, name: string, type: 'room' | 'equipment' } | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const handlePreview = async (asset: { id: string, name: string, type: 'room' | 'equipment' }) => {
        setPreviewAsset(asset);
        setIsPreviewLoading(true);
        setPreviewData([]);

        try {
            const table = asset.type === 'room' ? 'temperature_logs' : 'equipment_temperature_logs';
            const idField = asset.type === 'room' ? 'room_id' : 'equipment_id';
            const fromStr = dateRange?.from ? startOfDay(dateRange.from).toISOString() : subDays(new Date(), 30).toISOString();
            const toStr = dateRange?.to ? endOfDay(dateRange.to).toISOString() : new Date().toISOString();

            const { data, error } = await (supabase as any)
                .from(table)
                .select('*')
                .eq(idField, asset.id)
                .gte('recorded_at', fromStr)
                .lte('recorded_at', toStr)
                .order('recorded_at', { ascending: true });

            if (!error && data) {
                setPreviewData(data);
            }
        } catch (e) {
            console.error('Preview error:', e);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleExport = async (specificAssetId?: string, assetType?: 'room' | 'equipment') => {
        if (!dateRange?.from || !dateRange?.to) {
            toast.error('Silakan pilih rentang tanggal terlebih dahulu');
            return;
        }

        if (!includeRooms && !includeEquipment && !includeInspections && !specificAssetId) {
            toast.error('Silakan pilih setidaknya satu jenis data (Ruangan, Alat, atau Pemeriksaan)');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading(specificAssetId ? 'Menyiapkan laporan khusus...' : 'Sedang menyiapkan laporan profesional...');

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

            const fromStr = startOfDay(dateRange.from).toISOString();
            const toStr = endOfDay(dateRange.to).toISOString();

            // Fetch specific asset metadata first if it's a single export
            let specificAssetType: string | null = null;
            if (specificAssetId && assetType === 'equipment') {
                const { data: assetObj } = await (supabase as any).from('equipment').select('type').eq('id', specificAssetId).single();
                if (assetObj) specificAssetType = assetObj.type;
            }

            const isGlobal = !specificAssetId;
            const fetchRooms = isGlobal ? includeRooms : assetType === 'room';
            // Only fetch what matches the asset's real type if specific
            const fetchEquip = isGlobal ? includeEquipment : (assetType === 'equipment' && (specificAssetType === 'temperature' || !specificAssetType));
            const fetchInspections = isGlobal ? includeInspections : (assetType === 'equipment' && (specificAssetType === 'inspection' || !specificAssetType));

            console.log('--- Export Debug Info ---', {
                isGlobal,
                specificAssetId,
                assetType,
                realType: specificAssetType,
                dateRange: { from: fromStr, to: toStr },
                flags: { fetchRooms, fetchEquip, fetchInspections }
            });

            // Fetching Data
            if (fetchRooms) {
                let query = supabase
                    .from('temperature_logs')
                    .select('*, rooms!inner(id, name, location)')
                    .gte('recorded_at', fromStr)
                    .lte('recorded_at', toStr)
                    .order('recorded_at', { ascending: false });

                if (specificAssetId && assetType === 'room') {
                    query = query.eq('room_id', specificAssetId);
                }

                const { data: roomLogs, error: roomError } = await query;
                console.log('Room Query Result:', { count: roomLogs?.length, error: roomError });
                if (!roomError && roomLogs) {
                    roomLogsData = roomLogs;
                    roomLogs.forEach(log => log.recorded_by && userIds.add(log.recorded_by));
                }
            }

            if (fetchEquip) {
                let query = supabase
                    .from('equipment_temperature_logs')
                    .select('*, equipment!inner(id, name, location, type)')
                    .gte('recorded_at', fromStr)
                    .lte('recorded_at', toStr)
                    .order('recorded_at', { ascending: false });

                if (specificAssetId && assetType === 'equipment') {
                    query = query.eq('equipment_id', specificAssetId);
                }

                const { data: equipmentLogs, error: equipError } = await query;
                console.log('Equip Logs Query Result:', {
                    count: equipmentLogs?.length,
                    error: equipError,
                    from: fromStr,
                    to: toStr,
                    assetId: specificAssetId
                });
                if (!equipError && equipmentLogs) {
                    equipLogsData = equipmentLogs;
                    equipmentLogs.forEach(log => log.recorded_by && userIds.add(log.recorded_by));
                }
            }

            if (fetchInspections) {
                let query = (supabase as any)
                    .from('equipment_inspections')
                    .select('*, equipment!inner(id, name, location, type)')
                    .gte('inspected_at', fromStr)
                    .lte('inspected_at', toStr)
                    .order('inspected_at', { ascending: false });

                if (specificAssetId && assetType === 'equipment') {
                    query = query.eq('equipment_id', specificAssetId);
                }

                const { data: inspections, error: inspectionError } = await query;
                console.log('Inspections Query Result:', { count: inspections?.length, error: inspectionError });
                if (!inspectionError && inspections) {
                    inspectionsData = inspections;
                    inspections.forEach((log: any) => log.inspected_by && userIds.add(log.inspected_by));
                }
            }

            // Fallback check if specific asset has no data
            if (!isGlobal && roomLogsData.length === 0 && equipLogsData.length === 0 && inspectionsData.length === 0) {
                console.warn('No data found in date range. Checking asset existence and ANY logs...');
                if (assetType === 'room') {
                    const { data: room } = await supabase.from('rooms').select('name').eq('id', specificAssetId).single();
                    const { data: allLogs } = await supabase.from('temperature_logs').select('recorded_at').eq('room_id', specificAssetId);
                    console.log('Asset Check (Room):', { room, totalLogsEver: allLogs?.length, dates: allLogs?.map(l => l.recorded_at) });
                } else {
                    const { data: equip } = await supabase.from('equipment').select('name, type').eq('id', specificAssetId).single();
                    const { data: allTemps } = await supabase.from('equipment_temperature_logs').select('recorded_at').eq('equipment_id', specificAssetId);
                    const { data: allInsps } = await supabase.from('equipment_inspections').select('inspected_at').eq('equipment_id', specificAssetId);
                    console.log('Asset Check (Equip):', {
                        equip,
                        totalTempLogsEver: allTemps?.length,
                        totalInspsEver: allInsps?.length,
                        tempDates: allTemps?.map(t => t.recorded_at),
                        inspDates: allInsps?.map(i => i.inspected_at)
                    });
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

            const applySheetStyle = (sheet: ExcelJS.Worksheet, columns: Partial<ExcelJS.Column>[], title: string, infoRows: { label: string, value: string }[]) => {
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
                const headerStartCol = Math.min(4, columns.length);
                if (headerStartCol < columns.length) {
                    sheet.mergeCells(1, headerStartCol, 1, columns.length);
                    const h1 = sheet.getCell(1, headerStartCol);
                    h1.value = 'LABORATORIUM PENGUJI';
                    h1.font = { bold: true, size: 12 };
                    h1.alignment = { horizontal: 'right' };

                    sheet.mergeCells(2, headerStartCol, 2, columns.length);
                    const h2 = sheet.getCell(2, headerStartCol);
                    h2.value = 'LABORATORIUM KESEHATAN MASYARAKAT';
                    h2.font = { bold: true, size: 11 };
                    h2.alignment = { horizontal: 'right' };

                    sheet.mergeCells(3, headerStartCol, 3, columns.length);
                    const h3 = sheet.getCell(3, headerStartCol);
                    h3.value = 'MAKASSAR II';
                    h3.font = { bold: true, size: 12 };
                    h3.alignment = { horizontal: 'right' };
                }

                // Main Title
                sheet.mergeCells(5, 1, 5, columns.length);
                const titleCell = sheet.getCell(5, 1);
                titleCell.value = title.toUpperCase();
                titleCell.font = { bold: true, size: 14 };
                titleCell.alignment = { horizontal: 'center' };
                titleCell.border = { bottom: { style: 'thin' } };

                // Info Rows
                const midPoint = Math.max(1, Math.floor(columns.length / 2));

                // Row 6: First Item & Month
                if (infoRows.length > 0) {
                    sheet.mergeCells(6, 1, 6, midPoint);
                    sheet.getCell(6, 1).value = `${infoRows[0].label} : ${infoRows[0].value}`;
                    sheet.getCell(6, 1).font = { bold: true };
                }

                sheet.mergeCells(6, midPoint + 1, 6, columns.length);
                sheet.getCell(6, midPoint + 1).value = `Bulan : ${monthYear}`;
                sheet.getCell(6, midPoint + 1).font = { bold: true };
                sheet.getCell(6, midPoint + 1).alignment = { horizontal: 'right' };

                // Subsequent Info Rows
                let currentRow = 7;
                for (let i = 1; i < infoRows.length; i++) {
                    sheet.mergeCells(currentRow, 1, currentRow, midPoint);
                    sheet.getCell(currentRow, 1).value = `${infoRows[i].label} : ${infoRows[i].value}`;
                    sheet.getCell(currentRow, 1).font = { bold: true };
                    currentRow++;
                }

                return currentRow + 1; // Return next available row for table
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

            const addFooter = (sheet: ExcelJS.Worksheet, startRow: number, tableWidth: number, hideNotes: boolean = false) => {
                let row = startRow + 1;
                // Signature Section (Moved above Evaluasi)
                sheet.getCell(row, 1).value = 'Paraf Verif :';
                sheet.getCell(row, 1).font = { bold: true };
                
                // Draw a merged box for signature
                const sigBoxHeight = 3;
                sheet.mergeCells(row + 1, 1, row + sigBoxHeight, 2);
                for (let r = row + 1; r <= row + sigBoxHeight; r++) {
                    for (let c = 1; c <= 2; c++) {
                        sheet.getCell(r, c).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                }
                
                row += sigBoxHeight + 3; // Increased gap to match PDF request

                sheet.getCell(row, 1).value = 'Evaluasi :';
                sheet.getCell(row, 1).font = { bold: true };

                sheet.mergeCells(row + 1, 1, row + 4, tableWidth);
                sheet.getCell(row + 1, 1).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                sheet.getCell(row + 1, 1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
                sheet.getCell(row + 1, 1).value = '(Keterangan: Diisi oleh Penanggung Jawab Ruangan/Laboratorium)';
                sheet.getCell(row + 1, 1).font = { italic: true, size: 8, color: { argb: 'FF666666' } };

                row += 6; // Gap after Evaluasi box
                
                if (!hideNotes) {
                    sheet.getCell(row, 1).value = 'Catatan / Keterangan :';
                    sheet.getCell(row, 1).font = { bold: true };
                    sheet.getCell(row + 1, 1).value = '- Batas Keberterimaan Temperatur : 20±3°C dari standar';
                    sheet.getCell(row + 2, 1).value = '- Batas Keberterimaan Kelembaban : 45% - 65% (Permen LHK Nomor 23 Tahun 2020)';
                    sheet.getCell(row + 3, 1).value = '- Segera laporkan jika parameter berada di luar batas normal.';
                    sheet.getCell(row + 4, 1).value = '- Pemeriksaan AKU (Angka Kuman Udara) hanya di lakukan pada Ruang Pengujian';
                    row += 6;
                } else {
                    row += 2;
                }
                // Final Metadata Box
                const metaStartRow = row;

                sheet.getCell(row, 1).value = 'Edisi';
                sheet.getCell(row, 2).value = ': IV';
                sheet.mergeCells(row, tableWidth - 1, row, tableWidth);
                sheet.getCell(row, tableWidth - 1).value = 'Nomor Dokumen:';
                sheet.getCell(row, tableWidth - 1).alignment = { horizontal: 'right' };

                row++;
                sheet.getCell(row, 1).value = 'Revisi';
                sheet.getCell(row, 2).value = ': 0';
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

            // Grouping Logic
            const roomLogsByAsset = new Map<string, any[]>();
            roomLogsData.forEach(log => {
                const assetId = log.room_id || 'unknown';
                if (!roomLogsByAsset.has(assetId)) roomLogsByAsset.set(assetId, []);
                roomLogsByAsset.get(assetId)!.push(log);
            });

            const equipLogsByAsset = new Map<string, any[]>();
            equipLogsData.forEach(log => {
                // IMPORTANT: Only include logs if the equipment is still set to 'temperature' type
                // If the equipment has changed to 'inspection', hide old temp logs to avoid double tabs
                if ((log.equipment as any)?.type === 'inspection') return;
                
                const assetId = log.equipment_id || 'unknown';
                if (!equipLogsByAsset.has(assetId)) equipLogsByAsset.set(assetId, []);
                equipLogsByAsset.get(assetId)!.push(log);
            });

            const inspectionsByAsset = new Map<string, any[]>();
            inspectionsData.forEach(log => {
                // IMPORTANT: Only include inspections if the equipment is still set to 'inspection' type
                // If the equipment has changed to 'temperature', hide old inspection records
                if ((log.equipment as any)?.type === 'temperature') return;

                const assetId = log.equipment_id || 'unknown';
                if (!inspectionsByAsset.has(assetId)) inspectionsByAsset.set(assetId, []);
                inspectionsByAsset.get(assetId)!.push(log);
            });

            // DEBUG LOGS FOR DUPLATES
            console.log('--- DUPLICATE CHECK START ---');
            console.log('EQUIP TEMP LOGS GROUPING:');
            equipLogsByAsset.forEach((logs, id) => {
                console.log(`ID: ${id} | Name: ${logs[0]?.equipment?.name} | TypeInDB: ${logs[0]?.equipment?.type} | Count: ${logs.length}`);
            });
            console.log('EQUIP INSPECTION GROUPING:');
            inspectionsByAsset.forEach((logs, id) => {
                console.log(`ID: ${id} | Name: ${logs[0]?.equipment?.name} | TypeInDB: ${logs[0]?.equipment?.type} | Count: ${logs.length}`);
            });
            console.log('--- DUPLICATE CHECK END ---');

            console.log('Export Debug:', {
                roomLogsSize: roomLogsByAsset.size,
                equipLogsSize: equipLogsByAsset.size,
                inspectionsSize: inspectionsByAsset.size,
                specificAssetId,
                assetType
            });

            // Iterate over Equipment Assets (Temp Logs)
            for (const [equipId, logs] of equipLogsByAsset) {
                hasData = true;
                const equipName = logs[0]?.equipment?.name || 'Alat';
                const equipLocation = logs[0]?.equipment?.location;
                let safeEquipName = equipName.substring(0, 25).replace(/[:\\\?\*\[\]\/]/g, '');

                let counter = 1;
                let finalName = safeEquipName;
                while (workbook.getWorksheet(finalName)) {
                    finalName = `${safeEquipName} (${counter++})`;
                }
                const ws = workbook.addWorksheet(finalName);

                const cols = [{ width: 25 }, { width: 15 }, { width: 35 }];
                const startRow = applySheetStyle(ws, cols, "Rekaman Penyimpanan Spesimen Dan Reagensia", [
                    { label: "Nama Ruangan", value: equipLocation || '-' },
                    { label: "Nama Alat", value: equipName }
                ]);
                const headers = ["Waktu", "Suhu (°C)", "Petugas"];
                const rows = logs.map(log => [
                    format(new Date(log.recorded_at), 'dd/MM/yyyy HH:mm', { locale: id }),
                    log.temperature,
                    userMap.get(log.recorded_by || '') || '-'
                ]);
                const nextRow = addTableWithBorders(ws, startRow, headers, rows);
                addFooter(ws, nextRow, headers.length);
            }

            // Iterate over Equipment Assets (Inspections)
            for (const [equipId, logs] of inspectionsByAsset) {
                hasData = true;
                const equipName = logs[0]?.equipment?.name || 'Alat';
                const equipLocation = logs[0]?.equipment?.location;
                let baseName = (equipName + ' Cek').substring(0, 25).replace(/[:\\\?\*\[\]\/]/g, '');

                let counter = 1;
                let finalName = baseName;
                while (workbook.getWorksheet(finalName)) {
                    finalName = `${baseName} (${counter++})`;
                }
                const ws = workbook.addWorksheet(finalName);

                const cols = [{ width: 25 }, { width: 20 }, { width: 40 }, { width: 35 }];
                const startRow = applySheetStyle(ws, cols, "Rekaman Pemeliharaan & Pemeriksaan Alat", [
                    { label: "Nama Ruangan", value: equipLocation || '-' },
                    { label: "Nama Alat", value: equipName }
                ]);
                const headers = ["Waktu", "Kondisi", "Catatan", "Petugas"];
                const rows = logs.map(log => [
                    format(new Date(log.inspected_at), 'dd/MM/yyyy HH:mm', { locale: id }),
                    log.condition === 'bagus' ? 'Bagus' : 'Tidak Bagus',
                    log.notes || '-',
                    userMap.get(log.inspected_by || '') || '-'
                ]);
                const nextRow = addTableWithBorders(ws, startRow, headers, rows);
                addFooter(ws, nextRow, headers.length, true);
            }

            // Iterate over Room Assets
            for (const [roomId, logs] of roomLogsByAsset) {
                hasData = true;
                const roomName = logs[0]?.rooms?.name || 'Ruangan';
                const roomLocation = logs[0]?.rooms?.location;
                let safeRoomName = roomName.substring(0, 25).replace(/[:\\\?\*\[\]\/]/g, '');

                let counter = 1;
                let finalName = safeRoomName;
                while (workbook.getWorksheet(finalName)) {
                    finalName = `${safeRoomName} (${counter++})`;
                }
                const ws = workbook.addWorksheet(finalName);

                const cols = [{ width: 25 }, { width: 15 }, { width: 15 }, { width: 35 }];
                const startRow = applySheetStyle(ws, cols, "Rekaman Penyimpanan Spesimen Dan Reagensia", [
                    { label: "Nama Ruangan", value: roomName },
                    { label: "Lokasi", value: roomLocation || '-' }
                ]);
                const headers = ["Waktu", "Suhu (°C)", "RH (%)", "Petugas"];
                const rows = logs.map(log => [
                    format(new Date(log.recorded_at), 'dd/MM/yyyy HH:mm', { locale: id }),
                    log.temperature,
                    log.humidity,
                    userMap.get(log.recorded_by || '') || '-'
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
            const filename = specificAssetId ? `Laporan_Aset_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx` : `Laporan_Lab_Lengkap_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
            saveAs(blob, filename);

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

    // UI helper for asset list
    const [assets, setAssets] = useState<{ rooms: any[], equipment: any[] }>({ rooms: [], equipment: [] });
    useEffect(() => {
        const fetchAssets = async () => {
            const { data: rooms } = await supabase.from('rooms').select('*').order('name');
            const { data: equipment } = await supabase.from('equipment').select('*').order('name');
            setAssets({ rooms: rooms || [], equipment: equipment || [] });
        };
        fetchAssets();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container py-8 max-w-5xl">
                <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-primary" />
                            Laporan & Pengarsipan
                        </h1>
                        <p className="text-muted-foreground">
                            Pusat pembuatan laporan profesional sesuai standar Kemenkes untuk setiap alat dan ruangan.
                        </p>
                    </div>

                    <div className="flex bg-secondary/30 p-1 rounded-xl border border-border/50">
                        <Button
                            variant={activeTab === 'full' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={cn("rounded-lg px-6", activeTab === 'full' && "bg-white text-primary shadow-sm")}
                            onClick={() => setActiveTab('full')}
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Opsi Global
                        </Button>
                        <Button
                            variant={activeTab === 'assets' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={cn("rounded-lg px-6", activeTab === 'assets' && "bg-white text-primary shadow-sm")}
                            onClick={() => setActiveTab('assets')}
                        >
                            <List className="w-4 h-4 mr-2" />
                            Per Alat
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel: Settings */}
                    <div className="space-y-6">
                        <Card className="glass-card border-border/50 shadow-xl overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/10">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                    Periode Laporan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Rentang Tanggal</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal h-11 border-primary/20 hover:border-primary/40",
                                                    !dateRange && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                {dateRange?.from ? (
                                                    dateRange.to ? (
                                                        <>
                                                            {format(dateRange.from, "d MMM yy")} - {format(dateRange.to, "d MMM yy")}
                                                        </>
                                                    ) : (
                                                        format(dateRange.from, "d MMM yyyy")
                                                    )
                                                ) : (
                                                    <span>Pilih periode</span>
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
                                                numberOfMonths={1}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {activeTab === 'full' && (
                                    <div className="space-y-4 pt-2">
                                        <Label className="text-sm font-semibold">Komponen Laporan</Label>
                                        <div className="space-y-3 bg-secondary/20 p-4 rounded-xl border border-border/50">
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="rooms"
                                                    checked={includeRooms}
                                                    onCheckedChange={(c) => setIncludeRooms(c as boolean)}
                                                />
                                                <Label htmlFor="rooms" className="cursor-pointer text-sm flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-orange-500" />
                                                    Data Ruangan
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="equipment"
                                                    checked={includeEquipment}
                                                    onCheckedChange={(c) => setIncludeEquipment(c as boolean)}
                                                />
                                                <Label htmlFor="equipment" className="cursor-pointer text-sm flex items-center gap-2">
                                                    <Thermometer className="w-4 h-4 text-blue-500" />
                                                    Suhu Alat
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="inspections"
                                                    checked={includeInspections}
                                                    onCheckedChange={(c) => setIncludeInspections(c as boolean)}
                                                />
                                                <Label htmlFor="inspections" className="cursor-pointer text-sm flex items-center gap-2">
                                                    <ClipboardCheck className="w-4 h-4 text-green-500" />
                                                    Pemeriksaan Fisik
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'full' && (
                                    <Button
                                        className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all bg-primary hover:bg-primary/90"
                                        onClick={() => handleExport()}
                                        disabled={isExporting}
                                    >
                                        {isExporting ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                Export Semua Laporan
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 leading-relaxed">
                                Laporan Excel sekarang secara otomatis membagi data menjadi <strong>tab terpisah</strong> untuk setiap alat agar rapi saat dicetak atau diarsipkan.
                            </p>
                        </div>
                    </div>

                    {/* Right Panel: Asset List or Global Info */}
                    <div className="lg:col-span-2">
                        {activeTab === 'full' ? (
                            <div className="space-y-6">
                                <Card className="glass-card border-none bg-primary/5">
                                    <CardContent className="p-8 text-center space-y-4">
                                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
                                            <FileSpreadsheet className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-xl font-bold">Laporan Terbagi Otomatis</h2>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            Unduh laporan lengkap dalam satu file Excel dengan tab terpisah untuk setiap aset, atau pilih tab <strong>"Per Alat"</strong> di atas untuk mengunduh laporan alat tertentu saja.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div className="p-4 bg-white/50 rounded-lg border border-border/50 text-left">
                                                <span className="text-xs font-bold text-primary block mb-1 uppercase">Struktur Baru</span>
                                                <span className="text-sm">Satu tab untuk setiap Nama Alat/Ruangan</span>
                                            </div>
                                            <div className="p-4 bg-white/50 rounded-lg border border-border/50 text-left">
                                                <span className="text-xs font-bold text-primary block mb-1 uppercase">Standar Lab</span>
                                                <span className="text-sm">Dilengkapi Header & Footer resmi</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Tabs value={assetSubTab} onValueChange={setAssetSubTab} className="w-full">
                                    <TabsList className="w-full h-12 bg-secondary/30 mb-6 p-1 rounded-xl">
                                        <TabsTrigger value="equip" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                            <Thermometer className="w-4 h-4" />
                                            Peralatan ({assets.equipment.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="rooms" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                                            <Building2 className="w-4 h-4" />
                                            Ruangan ({assets.rooms.length})
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="equip" className="mt-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {assets.equipment.map((item) => (
                                                <Card key={item.id} className="group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                <Thermometer className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm leading-tight">{item.name}</div>
                                                                <div className="text-[10px] text-muted-foreground">{item.location}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-blue-500 hover:bg-blue-50 rounded-full"
                                                                onClick={() => handlePreview({ ...item, type: 'equipment' })}
                                                            >
                                                                <List className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-primary hover:bg-primary/10 rounded-full"
                                                                onClick={() => handleExport(item.id, 'equipment')}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="rooms" className="mt-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {assets.rooms.map((item) => (
                                                <Card key={item.id} className="group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                                                    <CardContent className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                                <Building2 className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-sm leading-tight">{item.name}</div>
                                                                <div className="text-[10px] text-muted-foreground">{item.location}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-blue-500 hover:bg-blue-50 rounded-full"
                                                                onClick={() => handlePreview({ ...item, type: 'room' })}
                                                            >
                                                                <List className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-primary hover:bg-primary/10 rounded-full"
                                                                onClick={() => handleExport(item.id, 'room')}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Preview Dialog */}
            <Dialog open={!!previewAsset} onOpenChange={(open) => !open && setPreviewAsset(null)}>
                <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Preview Data: {previewAsset?.name}</DialogTitle>
                    <DialogDescription>
                        Grafik riwayat data untuk aset ini pada periode yang dipilih.
                    </DialogDescription>
                </DialogHeader>
                    <div className="h-[400px] w-full mt-4">
                        {isPreviewLoading ? (
                            <div className="h-full w-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : previewData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={previewData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis 
                                        dataKey="recorded_at" 
                                        tickFormatter={(val) => format(new Date(val), 'dd/MM')}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip 
                                        labelFormatter={(val) => format(new Date(val), 'PPP p', { locale: id })}
                                    />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="temperature" 
                                        stroke="#3b82f6" 
                                        strokeWidth={2}
                                        dot={false}
                                        name="Suhu (°C)"
                                    />
                                    {previewAsset?.type === 'room' && (
                                        <Line 
                                            type="monotone" 
                                            dataKey="humidity" 
                                            stroke="#10b981" 
                                            strokeWidth={2}
                                            dot={false}
                                            name="Kelembaban (%)"
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                Tidak ada data untuk rentang tanggal ini.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

