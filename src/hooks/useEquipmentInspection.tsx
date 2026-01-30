import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export type InspectionCondition = 'bagus' | 'tidak_bagus';

export interface EquipmentInspection {
    id: string;
    equipment_id: string;
    condition: InspectionCondition;
    notes: string | null;
    inspected_by: string | null;
    inspected_at: string;
    equipment?: {
        name: string;
        location: string;
    };
}

export interface EquipmentWithLatestInspection {
    id: string;
    name: string;
    location: string;
    latestInspection?: EquipmentInspection;
}

// Get condition display info
export const getConditionInfo = (condition: InspectionCondition) => {
    switch (condition) {
        case 'bagus':
            return {
                label: 'Bagus',
                color: 'text-green-600',
                bgColor: 'bg-green-100',
                borderColor: 'border-green-500',
            };
        case 'tidak_bagus':
            return {
                label: 'Tidak Bagus',
                color: 'text-red-600',
                bgColor: 'bg-red-100',
                borderColor: 'border-red-500',
            };
        default:
            return {
                label: 'Unknown',
                color: 'text-gray-600',
                bgColor: 'bg-gray-100',
                borderColor: 'border-gray-500',
            };
    }
};

// Fetch all equipment inspections with filters
export function useEquipmentInspections(equipmentId?: string, fromDate?: Date, toDate?: Date) {
    return useQuery({
        queryKey: ['equipment_inspections', equipmentId, fromDate?.toISOString(), toDate?.toISOString()],
        queryFn: async () => {
            let query = supabase
                .from('equipment_inspections')
                .select(`
                    *,
                    equipment (
                        name,
                        location
                    )
                `)
                .order('inspected_at', { ascending: false });

            if (equipmentId) {
                query = query.eq('equipment_id', equipmentId);
            }
            if (fromDate) {
                query = query.gte('inspected_at', fromDate.toISOString());
            }
            if (toDate) {
                query = query.lte('inspected_at', toDate.toISOString());
            }

            const { data, error } = await query.limit(500);

            if (error) throw error;
            return data as EquipmentInspection[];
        },
    });
}

// Fetch latest equipment inspection
export function useLatestEquipmentInspection(equipmentId: string | null) {
    return useQuery({
        queryKey: ['equipment_inspection_latest', equipmentId],
        queryFn: async () => {
            if (!equipmentId) return null;

            const { data, error } = await supabase
                .from('equipment_inspections')
                .select(`
                    *,
                    equipment (
                        name,
                        location
                    )
                `)
                .eq('equipment_id', equipmentId)
                .order('inspected_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data as EquipmentInspection | null;
        },
        enabled: !!equipmentId,
    });
}

// Add equipment inspection mutation
export function useAddEquipmentInspection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            equipmentId,
            condition,
            notes,
            inspectedAt,
        }: {
            equipmentId: string;
            condition: InspectionCondition;
            notes?: string;
            inspectedAt?: Date;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await supabase
                .from('equipment_inspections')
                .insert({
                    equipment_id: equipmentId,
                    condition,
                    notes: notes || null,
                    inspected_by: user.id,
                    inspected_at: inspectedAt ? inspectedAt.toISOString() : undefined
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment_inspections'] });
            queryClient.invalidateQueries({ queryKey: ['equipment_inspection_latest'] });
        },
    });
}

// Update equipment inspection mutation
export function useUpdateEquipmentInspection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<EquipmentInspection> & { id: string }) => {
            const { data, error } = await supabase
                .from('equipment_inspections')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment_inspections'] });
            queryClient.invalidateQueries({ queryKey: ['equipment_inspection_latest'] });
        },
    });
}

// Delete equipment inspection mutation
export function useDeleteEquipmentInspection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error, count } = await supabase
                .from('equipment_inspections')
                .delete({ count: 'exact' })
                .eq('id', id);

            if (error) throw error;

            if (count === 0) {
                throw new Error("Failed to delete inspection: Record not found or permission denied.");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['equipment_inspections'] });
            queryClient.invalidateQueries({ queryKey: ['equipment_inspection_latest'] });
        },
    });
}

// Hook for realtime updates
export function useEquipmentInspectionsRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('equipment_inspections_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment_inspections',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['equipment_inspections'] });
                    queryClient.invalidateQueries({ queryKey: ['equipment_inspection_latest'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}

// Fetch all equipment with their latest inspection
export function useAllEquipmentWithLatestInspection() {
    const { data: equipment, isLoading: equipLoading } = useQuery({
        queryKey: ['equipment', 'all_inspection'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('equipment')
                .select('*')
                .eq('type', 'inspection')
                .order('name');
            if (error) throw error;
            return data as any[];
        }
    });

    const { data: latestInspections, isLoading: logsLoading } = useQuery({
        queryKey: ['equipment_inspections', 'latest_all_dashboard'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('equipment_inspections')
                .select('id, equipment_id, condition, notes, inspected_by, inspected_at')
                .order('inspected_at', { ascending: false });

            if (error) throw error;

            const latestMap = new Map();
            (data as any[])?.forEach(log => {
                if (!latestMap.has(log.equipment_id)) {
                    latestMap.set(log.equipment_id, log);
                }
            });

            return Array.from(latestMap.values());
        }
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel('equipment_inspections_dashboard_sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'equipment_inspections',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['equipment_inspections', 'latest_all_dashboard'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const combined = (equipment || []).map(equip => {
        const latest = latestInspections?.find((log: any) => log.equipment_id === equip.id);
        return {
            ...equip,
            latestInspection: latest
        };
    });

    return {
        data: combined as any[],
        isLoading: equipLoading || logsLoading
    };
}
