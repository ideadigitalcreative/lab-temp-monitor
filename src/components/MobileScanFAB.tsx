import { ScanBarcode } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function MobileScanFAB() {
    const location = useLocation();
    const navigate = useNavigate();

    // Don't show on scan page or auth page
    if (location.pathname === '/scan' || location.pathname === '/auth') return null;

    return (
        <Button
            className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
            onClick={() => navigate('/scan')}
            size="icon"
        >
            <ScanBarcode className="h-6 w-6" />
            <span className="sr-only">Scan QR</span>
        </Button>
    );
}
