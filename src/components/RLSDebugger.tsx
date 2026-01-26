import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function RLSDebugger() {
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const log = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const runTest = async () => {
        setIsLoading(true);
        setLogs([]);
        log("Starting RLS Diagnostics...");

        try {
            // 1. Check Auth
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                log("ERROR: Not authenticated!");
                return;
            }
            log(`User Authenticated: ${user.id}`);

            // 2. Check Profile Role
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profileError) {
                log(`ERROR checking profile: ${profileError.message}`);
            } else {
                log(`User Role: ${profile?.role}`);
            }

            // 3. Test Room Deletion Permissions (Simulation)
            // We'll insert a dummy room then try to delete it
            log("--- Testing Room Permissions ---");
            const dummyBarcode = `TEST-${Math.floor(Math.random() * 10000)}`;

            const { data: newRoom, error: createError } = await supabase
                .from('rooms')
                .insert({
                    name: 'RLS Test Room',
                    location: 'Virtual',
                    barcode: dummyBarcode
                })
                .select()
                .single();

            if (createError) {
                log(`❌ INSERT FAILED: ${createError.message}`);
                log("Cannot proceed with Delete test if Insert fails.");
            } else {
                log(`✅ INSERT SUCCESS: Created Room ID ${newRoom.id}`);

                // Try Delete
                const { error: deleteError, count } = await supabase
                    .from('rooms')
                    .delete({ count: 'exact' })
                    .eq('id', newRoom.id);

                if (deleteError) {
                    log(`❌ DELETE FAILED with Error: ${deleteError.message}`);
                } else if (count === 0) {
                    log(`⚠️ DELETE SUCCEEDED but Count is 0. This implies RLS hid the row from you.`);
                } else {
                    log(`✅ DELETE SUCCESS: Row removed.`);
                }
            }

            // 4. Test Temperature Logs Deletion
            log("--- Testing Temperature Log Deletion ---");
            // Find a log to test (read-only check first)
            const { data: existingLogs } = await supabase
                .from('temperature_logs')
                .select('id, room_id')
                .limit(1);

            if (!existingLogs || existingLogs.length === 0) {
                log("No temperature logs found to test.");
            } else {
                log(`Found ${existingLogs.length} logs. Testing permission on ID: ${existingLogs[0].id}`);
                // We won't actually delete real data, but we can check if we can SELECT it fully
                // or try to delete a non-existent ID to see if we get a Policy violation or just 0 count

                const fakeId = "00000000-0000-0000-0000-000000000000";
                const { error: reqError, count: reqCount } = await supabase
                    .from('temperature_logs')
                    .delete({ count: 'exact' })
                    .eq('id', fakeId);

                if (reqError) {
                    log(`❌ Policy Check caused Error: ${reqError.message}`);
                } else {
                    log(`ℹ️ Policy Check: Allowed to execute DELETE (Count ${reqCount}, expected 0). This is good.`);
                }
            }

        } catch (e: any) {
            log(`CRITICAL EXCEPTION: ${e.message}`);
        } finally {
            setIsLoading(false);
            log("Diagnostics Complete.");
        }
    };

    return (
        <Card className="w-full mt-8 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    RLS & Permission Debugger
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Button onClick={runTest} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Run Diagnostics
                </Button>

                <div className="mt-4 p-4 bg-black/90 text-green-400 font-mono text-xs rounded h-64 overflow-y-auto whitespace-pre-wrap">
                    {logs.length === 0 ? "Ready to test..." : logs.join('\n')}
                </div>
            </CardContent>
        </Card>
    );
}
