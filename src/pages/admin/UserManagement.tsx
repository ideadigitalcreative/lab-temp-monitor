import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Trash2, UserPlus, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

export default function UserManagement() {
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const queryClient = useQueryClient();

    // Fetch profiles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Profile[];
        },
    });

    // Create User Mutation (Note: This is tricky on client side without admin API functions)
    // Since we don't have a backend function to create users directly without logging in, 
    // We'll trust the user to sign up via the auth page or implement a backend function later for proper invite flow.
    // For now, let's focus on managing ROLES of existing users.

    // Update Role Mutation
    const updateRole = useMutation({
        mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'user' }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast.success('User role updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update role: ${error.message}`);
        },
    });

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground">Manage user access and roles</p>
                    </div>
                    {/* <Button onClick={() => setIsCreating(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button> */}
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
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {profiles?.map((profile) => (
                                    <TableRow key={profile.id}>
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
                                            <Select
                                                defaultValue={profile.role}
                                                onValueChange={(value) => updateRole.mutate({ id: profile.id, role: value as 'admin' | 'user' })}
                                                disabled={updateRole.isPending}
                                            >
                                                <SelectTrigger className="w-[130px] ml-auto">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="user">User</SelectItem>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </main>
        </div>
    );
}
