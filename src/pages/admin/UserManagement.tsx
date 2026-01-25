import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, UserPlus, Shield, ShieldOff, Loader2, Pencil } from 'lucide-react';
import { format } from 'date-fns';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useUsers, useUpdateUserRole, useDeleteUser, useUpdateUserProfile, Profile } from '@/hooks/useProfile';

export default function UserManagement() {
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const queryClient = useQueryClient();

    const { data: profiles, isLoading } = useUsers();
    const updateRole = useUpdateUserRole();
    const updateProfile = useUpdateUserProfile();
    const deleteUser = useDeleteUser();

    // Edit State
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');

    // Create User (Sign Up)
    const handleCreateUser = async () => {
        try {
            const { error } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        full_name: newUserEmail.split('@')[0], // Default name from email
                    }
                }
            });

            if (error) throw error;

            toast.success('User account created! You may need to verify email.');
            setIsCreating(false);
            setNewUserEmail('');
            setNewUserPassword('');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteUser = (id: string, email: string) => {
        if (confirm(`Are you sure you want to delete user ${email}?`)) {
            deleteUser.mutate(id);
        }
    };

    const handleUpdateProfile = () => {
        if (!editingUser) return;

        updateProfile.mutate({
            id: editingUser.id,
            full_name: editName
        }, {
            onSuccess: () => {
                setEditingUser(null);
                setEditName('');
            }
        });
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground">Manage user access and roles</p>
                    </div>
                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>
                                    Create a new user account. Warning: This will attempt to sign up a new user.
                                    If successful, it might affect your current session.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateUser}>Create User</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* User List */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profiles?.map((profile) => (
                                    <TableRow key={profile.id}>
                                        <TableCell>{profile.full_name || '-'}</TableCell>
                                        <TableCell className="font-medium">{profile.email}</TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.role === 'admin'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                                }`}>
                                                {profile.role}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(profile.created_at), 'PPP')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingUser(profile);
                                                        setEditName(profile.full_name || '');
                                                    }}
                                                    className="text-muted-foreground hover:text-primary"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Select
                                                    defaultValue={profile.role}
                                                    onValueChange={(value) => updateRole.mutate({ id: profile.id, role: value as 'admin' | 'user' })}
                                                    disabled={updateRole.isPending}
                                                >
                                                    <SelectTrigger className="w-[130px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">User</SelectItem>
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteUser(profile.id, profile.email)}
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    disabled={deleteUser.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Edit User Dialog */}
                <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit User Profile</DialogTitle>
                            <DialogDescription>
                                Update user information for {editingUser?.email}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                    Full Name
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUpdateProfile} disabled={updateProfile.isPending}>
                                {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
