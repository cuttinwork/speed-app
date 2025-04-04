import { useAuth } from '@/lib/auth';
import { VehicleGrid } from './dog-grid';
import { VehicleProfile } from './dog-profile';
import { AuthForm } from './auth-form';
import { UserNav } from './user-nav';
import { AccountCreation } from './account-creation';
import { UserProfile } from './user-profile';
import { MessagesList } from './messages-list';
import { Gauge, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Routes as RouterRoutes, Route, useNavigate, useParams, useLocation, Link, Navigate } from 'react-router-dom';

export function Routes() {
  const { user, loading } = useAuth();
  const [showNewListing, setShowNewListing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Extract search query from URL if present
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) {
      setSearchQuery(q);
    }
  }, [location.search]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Update URL with search query
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    navigate({ search: params.toString() });
  };

  const handleListingComplete = () => {
    setShowNewListing(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-8">
          <Link 
            to="/"
            className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity shrink-0"
          >
            <Gauge className="h-6 w-6" />
            <span className="inline-block">speed.app</span>
          </Link>

          {location.pathname !== '/auth' && (
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search"
                  className="w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {user ? (
            <UserNav 
              onMessagesClick={() => navigate('/messages')} 
              onNewListingClick={() => setShowNewListing(true)}
              onProfileClick={() => navigate('/profile')}
            />
          ) : (
            location.pathname !== '/auth' && (
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )
          )}
        </div>
      </header>

      <main className="container max-w-screen-2xl px-8 py-6">
        <RouterRoutes>
          <Route path="/" element={<VehicleGrid onVehicleSelect={(id) => navigate(`/vehicle/${id}`)} searchQuery={searchQuery} />} />
          <Route path="/vehicle/:id" element={<VehicleProfileWrapper />} />
          <Route path="/user/:id" element={<UserProfileWrapper />} />
          <Route path="/profile" element={user ? <UserProfile userId={user.id} onVehicleSelect={(id) => navigate(`/vehicle/${id}`)} /> : <Navigate to="/auth" />} />
          <Route path="/messages" element={user ? <MessagesList /> : <Navigate to="/auth" />} />
          <Route path="/auth" element={<AuthPage onAuthSuccess={(isNewUser) => {
            if (isNewUser) {
              navigate('/profile?edit=true');
            } else {
              navigate('/');
            }
          }} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </RouterRoutes>
      </main>

      <Dialog open={showNewListing} onOpenChange={setShowNewListing}>
        <DialogContent className="max-w-md p-0 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Create New Listing</DialogTitle>
          <AccountCreation onComplete={handleListingComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper components for routes with parameters
function VehicleProfileWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  if (!id) return <Navigate to="/" />;
  
  return (
    <VehicleProfile 
      dogId={id} 
      onBack={() => navigate(-1)}
      onProfileSelect={(userId) => navigate(`/user/${userId}`)}
    />
  );
}

function UserProfileWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  if (!id) return <Navigate to="/" />;
  
  return (
    <UserProfile 
      userId={id} 
      onBack={() => navigate(-1)}
      onVehicleSelect={(vehicleId) => navigate(`/vehicle/${vehicleId}`)}
    />
  );
}

function AuthPage({ onAuthSuccess }: { onAuthSuccess: (isNewUser?: boolean) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Gauge className="h-12 w-12 mb-4" />
      <h1 className="text-4xl font-bold mb-8">speed.app</h1>
      <div className="w-full max-w-sm">
        <AuthForm onAuthSuccess={onAuthSuccess} />
      </div>
    </div>
  );
}