import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
    id: string;
    email: string;
    role: 'admin' | 'user';
    created_at: string;
}

export function useProfile() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }

            return data as Profile;
        },
        enabled: !!user?.id,
    });
}
