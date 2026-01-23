import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

export function AdminRoute({ children }: { children: React.ReactNode }) {
    const { data: profile, isLoading } = useProfile();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && profile?.role !== 'admin') {
            navigate('/');
        }
    }, [profile, isLoading, navigate]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (profile?.role !== 'admin') {
        return null; // Will redirect via useEffect
    }

    return <>{children}</>;
}
