import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Search, QrCode as QrIcon, FileText, X, Check } from 'lucide-react';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, Room, useTemperatureLogs, useUpdateTemperatureLog, useDeleteTemperatureLog, TemperatureLog } from '@/hooks/useRooms';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';

export default function RoomManagement() {
    const { data: rooms, isLoading } = useRooms();
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();
    const deleteRoom = useDeleteRoom();

    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
    const [selectedRoomForQR, setSelectedRoomForQR] = useState<Room | null>(null);
    const [viewingLogsRoom, setViewingLogsRoom] = useState<Room | null>(null);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        barcode: '',
    });

    const filteredRooms = rooms?.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenCreate = () => {
        setEditingRoom(null);
        setFormData({ name: '', location: '', barcode: '' });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            location: room.location,
            barcode: room.barcode,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingRoom) {
                await updateRoom.mutateAsync({
                    id: editingRoom.id,
                    ...formData,
                });
                toast.success('Room updated successfully');
            } else {
                await createRoom.mutateAsync(formData);
                toast.success('Room created successfully');
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        }
    };

    const handleDelete = async (room: Room) => {
        if (confirm(`Are you sure you want to delete ${room.name}? This will also delete all temperature logs for this room.`)) {
            try {
                // First delete related logs is handled in the hook now
                await deleteRoom.mutateAsync(room.id);
                toast.success('Room deleted successfully');
            } catch (error: any) {
                console.error("Delete failed:", error);
                toast.error(error.message || 'Failed to delete room');
            }
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Room Management</h1>
                        <p className="text-muted-foreground">Add, edit, or remove laboratory rooms</p>
                    </div>
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Room
                    </Button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search rooms..."
                        className="pl-10 max-w-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Room List */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Barcode</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRooms?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No rooms found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRooms?.map((room) => (
                                        <TableRow key={room.id}>
                                            <TableCell className="font-medium">{room.name}</TableCell>
                                            <TableCell>{room.location}</TableCell>
                                            <TableCell>
                                                <code className="bg-secondary px-2 py-1 rounded text-xs">{room.barcode}</code>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="hidden md:flex"
                                                        onClick={() => {
                                                            setSelectedRoomForQR(room);
                                                            setIsQRDialogOpen(true);
                                                        }}
                                                    >
                                                        <QrIcon className="h-3 w-3 mr-2" />
                                                        QR Code
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setViewingLogsRoom(room)} title="View Data">
                                                        <FileText className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(room)}>
                                                        <Pencil className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(room)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </main >

            {/* Create/Edit Dialog */}
            < Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                        <div className="hidden">
                            <DialogDescription>Form to {editingRoom ? 'edit' : 'add'} a room</DialogDescription>
                        </div>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Room Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Lab Mikrobiologi"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="e.g. Gedung A, Lantai 2"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="barcode">Barcode ID</Label>
                            <Input
                                id="barcode"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="e.g. LAB-001"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                                {createRoom.isPending || updateRoom.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >
            {/* QR Code Dialog */}
            <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>QR Code for {selectedRoomForQR?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 space-y-4" id="qr-download-area">
                        <div className="bg-white p-6 rounded-2xl border-4 border-primary/10 shadow-sm flex flex-col items-center">
                            {selectedRoomForQR && (
                                <div id={`qr-svg-${selectedRoomForQR.id}`}>
                                    <QRCode
                                        value={`${window.location.origin}/scan?roomId=${selectedRoomForQR.id}`}
                                        size={220}
                                        level="H"
                                    />
                                </div>
                            )}
                            <div className="mt-4 text-center">
                                <p className="font-bold text-xl text-primary">{selectedRoomForQR?.name}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between gap-2">
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                className="flex-1 sm:flex-none"
                                onClick={() => {
                                    const printContent = document.getElementById('qr-download-area');
                                    if (printContent) {
                                        const win = window.open('', '', 'height=700,width=700');
                                        if (win) {
                                            win.document.write('<html><head><title>Print QR Code</title>');
                                            win.document.write('<style>body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } .qr-container { padding: 40px; border: 4px solid #000; border-radius: 20px; text-align: center; background: white; } svg { margin-bottom: 20px; }</style>');
                                            win.document.write('</head><body>');
                                            win.document.write('<div class="qr-container">');
                                            win.document.write(printContent.innerHTML);
                                            win.document.write('</div>');
                                            win.document.write('</body></html>');
                                            win.document.close();
                                            setTimeout(() => {
                                                win.print();
                                            }, 500);
                                        }
                                    }
                                }}
                            >
                                Print QR
                            </Button>
                            <Button
                                variant="default"
                                className="flex-1 sm:flex-none"
                                onClick={() => {
                                    if (!selectedRoomForQR) return;
                                    const svg = document.querySelector(`#qr-svg-${selectedRoomForQR.id} svg`);
                                    if (svg) {
                                        const svgData = new XMLSerializer().serializeToString(svg);
                                        const canvas = document.createElement("canvas");
                                        const ctx = canvas.getContext("2d");
                                        const img = new Image();

                                        // Higher resolution for download
                                        const size = 1000;
                                        canvas.width = size;
                                        canvas.height = size + 150; // Extra space for text

                                        img.onload = () => {
                                            if (ctx) {
                                                // Background
                                                ctx.fillStyle = "white";
                                                ctx.fillRect(0, 0, canvas.width, canvas.height);

                                                // Draw QR
                                                ctx.drawImage(img, 100, 50, 800, 800);

                                                // Add Text
                                                ctx.fillStyle = "black";
                                                ctx.font = "bold 60px Arial";
                                                ctx.textAlign = "center";
                                                ctx.fillText(selectedRoomForQR.name, size / 2, size - 20);

                                                // Download
                                                const pngFile = canvas.toDataURL("image/png");
                                                const downloadLink = document.createElement("a");
                                                downloadLink.download = `QR_${selectedRoomForQR.name.replace(/\s+/g, '_')}.png`;
                                                downloadLink.href = `${pngFile}`;
                                                downloadLink.click();
                                            }
                                        };
                                        img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                    }
                                }}
                            >
                                Download PNG
                            </Button>
                        </div>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">Tutup</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Temperature Logs Management Dialog */}
            < TemperatureLogsDialog
                room={viewingLogsRoom}
                open={!!viewingLogsRoom
                }
                onOpenChange={(open) => !open && setViewingLogsRoom(null)}
            />
        </div >
    );
}

function TemperatureLogsDialog({ room, open, onOpenChange }: { room: Room | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { data: logs, isLoading } = useTemperatureLogs(room?.id);
    const updateLog = useUpdateTemperatureLog();
    const deleteLog = useDeleteTemperatureLog();

    // Inline editing state
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ temperature: 0, humidity: 0 });

    const startEdit = (log: TemperatureLog) => {
        setEditingLogId(log.id);
        setEditForm({ temperature: log.temperature, humidity: log.humidity });
    };

    const cancelEdit = () => {
        setEditingLogId(null);
    };

    const saveEdit = async (id: string) => {
        try {
            await updateLog.mutateAsync({
                id,
                temperature: editForm.temperature,
                humidity: editForm.humidity
            });
            toast.success('Data updated');
            setEditingLogId(null);
        } catch (e: any) {
            toast.error('Failed to update');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this record?')) {
            try {
                await deleteLog.mutateAsync(id);
                toast.success('Record deleted');
            } catch (e) {
                toast.error('Failed to delete');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Temperature Data: {room?.name}</DialogTitle>
                    <div className="hidden">
                        <DialogDescription>Temperature log history for {room?.name}</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Temperature (°C)</TableHead>
                                    <TableHead>Humidity (%)</TableHead>
                                    <TableHead>Recorded By</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                            No data recorded yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs?.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(log.recorded_at), 'PP p')}
                                            </TableCell>
                                            <TableCell>
                                                {editingLogId === log.id ? (
                                                    <Input
                                                        type="number"
                                                        value={editForm.temperature}
                                                        onChange={e => setEditForm({ ...editForm, temperature: parseFloat(e.target.value) })}
                                                        className="w-24 h-8"
                                                    />
                                                ) : (
                                                    <span className={log.temperature > 25 || log.temperature < 18 ? 'text-red-500 font-bold' : ''}>
                                                        {log.temperature}°C
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingLogId === log.id ? (
                                                    <Input
                                                        type="number"
                                                        value={editForm.humidity}
                                                        onChange={e => setEditForm({ ...editForm, humidity: parseFloat(e.target.value) })}
                                                        className="w-24 h-8"
                                                    />
                                                ) : (
                                                    <span>{log.humidity}%</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {log.recorded_by ? 'User/Admin' : 'System'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {editingLogId === log.id ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => saveEdit(log.id)} className="h-8 w-8 text-green-600">
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 text-gray-500">
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => startEdit(log)} className="h-8 w-8 text-blue-500">
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)} className="h-8 w-8 text-red-500">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
