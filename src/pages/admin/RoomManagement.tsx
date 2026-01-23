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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Search, QrCode as QrIcon } from 'lucide-react';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom, Room } from '@/hooks/useRooms';
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
                await deleteRoom.mutateAsync(room.id);
                toast.success('Room deleted successfully');
            } catch (error: any) {
                toast.error('Failed to delete room');
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
            </main>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
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
            </Dialog>
            {/* QR Code Dialog */}
            <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>QR Code for {selectedRoomForQR?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 space-y-4" id="print-area">
                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                            {selectedRoomForQR && (
                                <QRCode
                                    value={`${window.location.origin}/scan?roomId=${selectedRoomForQR.id}`}
                                    size={200}
                                />
                            )}
                        </div>
                        <div className="text-center space-y-1">
                            <p className="font-bold text-lg">{selectedRoomForQR?.name}</p>
                            <p className="text-sm text-muted-foreground">{selectedRoomForQR?.location}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <code className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                                    {`${window.location.origin}/scan?roomId=${selectedRoomForQR?.id}`}
                                </code>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between">
                        <Button
                            variant="outline"
                            onClick={() => {
                                const printContent = document.getElementById('print-area');
                                if (printContent) {
                                    const win = window.open('', '', 'height=700,width=700');
                                    if (win) {
                                        win.document.write('<html><head><title>Print QR Code</title>');
                                        win.document.write('<style>body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; } .qr-container { padding: 20px; border: 2px solid #000; border-radius: 10px; text-align: center; } svg { margin-bottom: 20px; }</style>');
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
                        <DialogClose asChild>
                            <Button type="button" variant="ghost">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
