import { ThemeProvider } from '@/components/theme-provider';
import { AppRoutes } from '@/components/routes';
import { Toaster } from '@/components/ui/sonner';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AppRoutes />
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;