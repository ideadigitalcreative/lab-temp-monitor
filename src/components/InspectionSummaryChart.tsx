import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { EquipmentWithLatestInspection } from '@/hooks/useEquipmentInspection';
import { cn } from '@/lib/utils';
import { ClipboardCheck } from 'lucide-react';

interface InspectionSummaryChartProps {
    data: EquipmentWithLatestInspection[];
    className?: string;
}

const COLORS = {
    bagus: '#10b981', // green-500
    tidak_bagus: '#ef4444', // red-500
    not_inspected: '#94a3b8', // slate-400
};

export function InspectionSummaryChart({ data, className }: InspectionSummaryChartProps) {
    const summaryData = useMemo(() => {
        let bagus = 0;
        let tidakBagus = 0;
        let notInspected = 0;

        data.forEach(item => {
            if (!item.latestInspection) {
                notInspected++;
            } else if (item.latestInspection.condition === 'bagus') {
                bagus++;
            } else {
                tidakBagus++;
            }
        });

        return [
            { name: 'Kondisi Bagus', value: bagus, color: COLORS.bagus, id: 'bagus' },
            { name: 'Tidak Bagus', value: tidakBagus, color: COLORS.tidak_bagus, id: 'tidak_bagus' },
            { name: 'Belum Diperiksa', value: notInspected, color: COLORS.not_inspected, id: 'not_inspected' },
        ].filter(item => item.value > 0);
    }, [data]);

    const total = data.length;
    const goodPercent = total > 0 ? Math.round((summaryData.find(d => d.id === 'bagus')?.value || 0) / total * 100) : 0;

    return (
        <Card className={cn("glass-card border-none overflow-hidden", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                        <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Kondisi Alat</CardTitle>
                        <CardDescription>Ringkasan pemeriksaan fisik alat</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={summaryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={1500}
                            >
                                {summaryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => <span className="text-xs font-medium text-muted-foreground">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-4 text-center">
                        <span className="text-2xl font-bold block">{goodPercent}%</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Layak</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
