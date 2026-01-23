import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import ScanPage from "./pages/ScanPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import RoomManagement from "./pages/admin/RoomManagement";
import UserManagement from "./pages/admin/UserManagement";
import { AdminRoute } from "./components/AdminRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/auth" element={<Auth />} />

            {/* Admin Routes */}
            <Route path="/admin/rooms" element={
              <AdminRoute>
                <RoomManagement />
              </AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
