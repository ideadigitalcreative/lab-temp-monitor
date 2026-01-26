import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Equipment {
    id: string;
    name: string;
    location: string;
    barcode: string;
    created_at: string;
    updated_at: string;
}

export interface EquipmentTemperatureLog {
    id: string;
    equipment_id: string;
    temperature: number;
    recorded_by: string | null;
    recorded_at: string;
    equipment?: {
        name: string;
        location: string;
    };
}

export interface EquipmentWithLatestReading extends Equipment {
    latestReading?: EquipmentTemperatureLog;
    status: 'normal' | 'warning' | 'critical';
}

// Get equipment temperature status
export const getEquipmentStatus = (temp: number, name?: string): 'normal' | 'warning' | 'critical' => {
    const nameLower = (name || '').toLowerCase();

    // Smart threshold based on equipment name
    if (nameLower.includes('freezer')) {
        if (temp < -25 || temp > -15) return 'critical';
        if (temp < -22 || temp > -18) return 'warning';
        return 'normal';
    }

    if (nameLower.includes('refrigerator') || nameLower.includes('kulkas')) {
        if (temp < 0 || temp > 10) return 'critical';
        if (temp < 2 || temp > 8) return 'warning';
        return 'normal';
    }

    if (nameLower.includes('inkubator')) {
        if (temp < 30 || temp > 45) return 'critical';
        if (temp < 35 || temp > 39) return 'warning';
        return 'normal';
    }

    // Default/Standard thresholds for equipment
    if (temp < 15 || temp > 30) return 'critical';
    if (temp < 18 || temp > 26) return 'warning';
    return 'normal';
};

// Fetch all equipment
export function useEquipment() {
    return useQuery({
        queryKey: ['equipment'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .order('name');

            if (error) throw error;
            return data as Equipment[];
        },
    });
}

// Fetch equipment by barcode
export function useEquipmentByBarcode(barcode: string | null) {
    return useQuery({
        queryKey: ['equipment', 'barcode', barcode],
        queryFn: async () => {
            if (!barcode) return null;

            const { data, error } = await supabase
                .from('equipment')
                .select('*')
                .eq('barcode', barcode)
                .maybeSingle();

            if (error) throw error;
            return data as Equipment | null;
        },
        enabled: !!barcode,
    });
}

// Fetch equipment temperature logs with filters
export function useEquipmentTemperatureLogs(equipmentId?: string, fromDate?: Date, toDate?: Date) {
    return useQuery({
        queryKey: ['equipment_temperature_logs', equipmentId, fromDate?.toISOString(), toDate?.toISOString()],
        queryFn: async () => {
            let query = supabase
                .from('equipment_temperature_logs')
                .select(`
          *,
          equipment (
            name,
            location
          )
        `)
                .order('recorded_at', { ascending: true });

            if (equipmentId) {
                query = query.eq('equipment_id', equipmentId);
            }
            if (fromDate) {
                query = query.gte('recorded_at', fromDate.toISOString());
            }
            if (toDate) {
                query = query.lte('recorded_at', toDate.toISOString());
            }

            const { data, error } = await query.limit(500);

            if (error) throw error;
            return data as EquipmentTemperatureLog[];
        },
    });
}

// Fetch equipment with latest readings
export function useEquipmentWithLatestReadings() {
    const { data: equipment, isLoading: equipmentLoading } = useEquipment();

    const { data: latestLogs, isLoading: logsLoading } = useQuery({
        queryKey: ['latest_equipment_temperature_logs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('equipment_temperature_logs')
                .select(`
          *,
          equipment (
            name,
            location
          )
        `)
                .order('recorded_at', { ascending: false });

            if (error) throw error;
            return data as EquipmentTemperatureLog[];
        },
    });

    const queryClient = useQueryClient();

    // Set up realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('equipment_temperature_logs_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'equipment_temperature_logs',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['latest_equipment_temperature_logs'] });
                    queryClient.invalidateQueries({ queryKey: ['equipment_temperature_logs'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const equipmentWithReadings: EquipmentWithLatestReading[] = (equipment || []).map((item) => {
        const latestLog = latestLogs?.find((log) => log.equipment_id === item.id);
        const status = latestLog
            ? getEquipmentStatus(latestLog.temperature, item.name)
            : 'normal';

        return {
            ...item,
            latestReading: latestLog,
            status,
        };
    });

    return {
        data: equipmentWithReadings,
        isLoading: equipmentLoading || logsLoading,
    };
}

// Add equipment temperature log mutation
export function useAddEquipmentTemperatureLog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            equipmentId,
            temperature,
        }: {
            equipmentId: string;
            temperature: number;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('equipment_temperature_logs')
                .insert({
                    equipment_id: equipmentId,
                    temperature,
                    recorded_by: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment_temperature_logs'] });
            queryClient.invalidateQueries({ queryKey: ['latest_equipment_temperature_logs'] });
        },
    });
}

// Equipment Management Mutations
export function useCreateEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (item: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>) => {
            const { data, error } = await supabase
                .from('equipment')
                .insert(item)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
}

export function useUpdateEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Equipment> & { id: string }) => {
            const { data, error } = await supabase
                .from('equipment')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
}

export function useDeleteEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // First delete all related temperature logs
            const { error: logsError } = await supabase
                .from('equipment_temperature_logs')
                .delete()
                .eq('equipment_id', id);

            if (logsError) throw logsError;

            // Then delete the equipment
            const { error, data } = await supabase
                .from('equipment')
                .delete()
                .eq('id', id)
                .select();

            if (error) {
                console.error("Supabase delete equipment error:", error);
                throw error;
            }



            if (!data || data.length === 0) {
                console.error("Delete equipment returned no data. Check RLS policies or if ID exists.");
                throw new Error('Equipment could not be deleted. It may not exist or permission is denied.');
            }

            // DEBUG: Verify deletion
            const { data: checkData } = await supabase
                .from('equipment')
                .select('id')
                .eq('id', id)
                .maybeSingle();

            if (checkData) {
                throw new Error('CRITICAL: Deletion appeared successful but record still exists in DB. Check Database Triggers or RLS.');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
        },
    });
}

// Equipment Temperature Log Management Mutations (Admin Only)
export function useUpdateEquipmentTemperatureLog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<EquipmentTemperatureLog> & { id: string }) => {
            const { data, error } = await supabase
                .from('equipment_temperature_logs')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment_temperature_logs'] });
            queryClient.invalidateQueries({ queryKey: ['latest_equipment_temperature_logs'] });
        },
    });
}

export function useDeleteEquipmentTemperatureLog() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error, count } = await supabase
                .from('equipment_temperature_logs')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (error) throw error;

            if (count === 0) {
                throw new Error("Failed to delete log: Record not found or permission denied.");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment_temperature_logs'] });
            queryClient.invalidateQueries({ queryKey: ['latest_equipment_temperature_logs'] });
        },
    });
}
