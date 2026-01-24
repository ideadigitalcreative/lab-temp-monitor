import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ScanBarcode, LayoutDashboard, Users, DoorOpen, Download, LogOut, Maximize, Minimize, Box } from 'lucide-react';
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
      { href: '/admin/equipment', label: 'Equipment', icon: Box },
      { href: '/admin/users', label: 'Users', icon: Users }
    );
  }

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Monitor fullscreen change (e.g. if user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

          <Button
            variant="ghost"
            size="sm"
            className="ml-1 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Tampilkan Layar Penuh'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
            <span className="hidden lg:inline ml-2">{isFullscreen ? 'Normal' : 'Full Screen'}</span>
          </Button>

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
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border/50">
              <span className="hidden xl:inline text-xs text-muted-foreground mr-1">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-white hover:bg-destructive transition-all"
                onClick={signOut}
                title="Keluar"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
