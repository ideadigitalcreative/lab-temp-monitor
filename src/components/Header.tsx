import { Link, useLocation } from 'react-router-dom';
import { Activity, ScanBarcode, LayoutDashboard, Users, DoorOpen, Download, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';

export function Header() {
  const location = useLocation();
  const { data: profile } = useProfile();
  const { signOut, user } = useAuth();
  const { isInstallable, installApp } = usePWA();

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/scan', label: 'Input Data', icon: ScanBarcode },
  ];

  if (profile?.role === 'admin') {
    navLinks.push(
      { href: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
      { href: '/admin/users', label: 'Users', icon: Users }
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">LabTemp</h1>
            <p className="text-xs text-muted-foreground leading-tight">Monitoring System</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}

          {isInstallable && (
            <Button
              variant="outline"
              size="sm"
              className="ml-2 gap-2"
              onClick={installApp}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Install</span>
            </Button>
          )}

          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
