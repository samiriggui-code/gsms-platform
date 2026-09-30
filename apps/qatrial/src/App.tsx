import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './components/auth/LoginPage';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from './components/hifi';
import { TooltipProvider } from './components/ui/tooltip';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { InstallAppToast } from './components/pwa/InstallAppToast';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  const path = window.location.pathname;
  const isPublicPortal = path.startsWith('/audit/') || path.startsWith('/supplier/');

  if (!isPublicPortal) {
    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-secondary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      );
    }
    if (!isAuthenticated) {
      return <LoginPage />;
    }
  }

  return <AppRoutes />;
}

function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={200}>
        <OfflineBanner />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <InstallAppToast />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}

export default App;
