import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, ArrowLeft, ClipboardCheck, Box, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { InspectionCondition, getConditionInfo } from '@/hooks/useEquipmentInspection';
import { Input } from '@/components/ui/input';

interface Equipment {
    id: string;
    name: string;
    location: string;
}

interface EquipmentInspectionFormProps {
    equipment: Equipment;
    onSubmit: (data: { condition: InspectionCondition; notes?: string; customDate?: Date }) => Promise<void>;
    onReset: () => void;
    isSubmitting: boolean;
}

export function EquipmentInspectionForm({
    equipment,
    onSubmit,
    onReset,
    isSubmitting,
}: EquipmentInspectionFormProps) {
    const [condition, setCondition] = useState<InspectionCondition | null>(null);
    const [notes, setNotes] = useState('');
    const [success, setSuccess] = useState(false);
    const [useManualTime, setUseManualTime] = useState(false);
    const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!condition) return;

        try {
            const customDate = useManualTime ? new Date(manualDate) : undefined;
            await onSubmit({ condition, notes: notes.trim() || undefined, customDate });
            setSuccess(true);

            // Reset after 2 seconds for rapid successive scans
            setTimeout(() => {
                setSuccess(false);
                setCondition(null);
                setNotes('');
                setUseManualTime(false);
                onReset();
            }, 2000);
        } catch (error) {
            console.error('Error submitting inspection:', error);
        }
    };

    if (success) {
        return (
            <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center text-center animate-slide-up">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                    Pemeriksaan Berhasil!
                </h2>
                <p className="text-muted-foreground">
                    Data pemeriksaan alat telah tercatat
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card rounded-xl p-5 animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onReset}
                    className="shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Box className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground truncate">
                            Pemeriksaan Alat
                        </span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground truncate">
                        {equipment.name}
                    </h2>
                    <p className="text-sm text-muted-foreground truncate">
                        {equipment.location}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Condition Selection */}
                <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-base font-medium">
                        <ClipboardCheck className="w-4 h-4 text-primary" />
                        Kondisi Alat
                    </Label>
                    <RadioGroup
                        value={condition || ''}
                        onValueChange={(value) => setCondition(value as InspectionCondition)}
                        className="grid grid-cols-2 gap-3"
                    >
                        {/* Bagus Option */}
                        <Label
                            htmlFor="condition-bagus"
                            className={`
                                flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${condition === 'bagus'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-border hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                                }
                            `}
                        >
                            <RadioGroupItem
                                value="bagus"
                                id="condition-bagus"
                                className="sr-only"
                            />
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center
                                ${condition === 'bagus'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                }
                            `}>
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <span className={`
                                font-semibold text-center
                                ${condition === 'bagus'
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-foreground'
                                }
                            `}>
                                Bagus
                            </span>
                        </Label>

                        {/* Tidak Bagus Option */}
                        <Label
                            htmlFor="condition-tidak_bagus"
                            className={`
                                flex flex-col items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all
                                ${condition === 'tidak_bagus'
                                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'border-border hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10'
                                }
                            `}
                        >
                            <RadioGroupItem
                                value="tidak_bagus"
                                id="condition-tidak_bagus"
                                className="sr-only"
                            />
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center
                                ${condition === 'tidak_bagus'
                                    ? 'bg-red-500 text-white'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                }
                            `}>
                                <XCircle className="w-6 h-6" />
                            </div>
                            <span className={`
                                font-semibold text-center
                                ${condition === 'tidak_bagus'
                                    ? 'text-red-700 dark:text-red-300'
                                    : 'text-foreground'
                                }
                            `}>
                                Tidak Bagus
                            </span>
                        </Label>
                    </RadioGroup>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                    <Label htmlFor="notes" className="text-base font-medium">
                        Catatan <span className="text-muted-foreground font-normal">(opsional)</span>
                    </Label>
                    <Textarea
                        id="notes"
                        placeholder="Tambahkan catatan mengenai kondisi alat..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="resize-none"
                    />
                </div>

                {/* Timestamp Selection */}
                <div className="glass-card bg-secondary/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="inspection-manual-time-toggle" className="text-sm font-medium cursor-pointer">
                            Gunakan Waktu Manual
                        </Label>
                        <input
                            id="inspection-manual-time-toggle"
                            type="checkbox"
                            className="w-4 h-4"
                            checked={useManualTime}
                            onChange={(e) => setUseManualTime(e.target.checked)}
                        />
                    </div>

                    {useManualTime ? (
                        <div className="space-y-2 animate-fade-in">
                            <Label htmlFor="inspectedAt" className="text-xs text-muted-foreground">
                                Pilih Tanggal & Waktu Pemeriksaan
                            </Label>
                            <Input
                                id="inspectedAt"
                                type="datetime-local"
                                className="font-mono bg-background"
                                value={manualDate}
                                onChange={(e) => setManualDate(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="text-center transition-all">
                            <p className="text-sm text-muted-foreground">
                                Waktu pemeriksaan (Otomatis):{' '}
                                <span className="font-medium text-foreground block mt-1">
                                    {format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: id })}
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!condition || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Simpan Pemeriksaan
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
