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

type View = 'grid' | 'profile' | 'messages' | 'settings' | 'user-profile' | 'auth' | 'edit-profile';

export function Routes() {
  const { user, loading } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showNewListing, setShowNewListing] = useState(false);
  const [currentView, setCurrentView] = useState<View>('grid');
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Reset edit mode when user changes
    if (!user) {
      setEditMode(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleNavigation = (view: View) => {
    setCurrentView(view);
    setSelectedVehicle(null);
    setSelectedProfile(null);
  };

  const handleListingComplete = () => {
    setShowNewListing(false);
    handleNavigation('grid');
  };

  const handleProfileSelect = (userId: string) => {
    setSelectedProfile(userId);
    setSelectedVehicle(null);
    setCurrentView('profile');
  };

  const handleAuthSuccess = (isNewUser?: boolean) => {
    setEditMode(isNewUser || false);
    handleNavigation('user-profile');
  };

  const renderContent = () => {
    if (currentView === 'auth') {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Gauge className="h-12 w-12 mb-4" />
          <h1 className="text-4xl font-bold mb-8">speed.app</h1>
          <div className="w-full max-w-sm">
            <AuthForm onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>
      );
    }

    if (selectedVehicle) {
      return (
        <VehicleProfile 
          dogId={selectedVehicle} 
          onBack={() => setSelectedVehicle(null)}
          onProfileSelect={handleProfileSelect}
        />
      );
    }

    if (!user) {
      return <VehicleGrid onVehicleSelect={setSelectedVehicle} searchQuery={searchQuery} />;
    }

    if (selectedProfile) {
      return (
        <UserProfile 
          userId={selectedProfile} 
          onBack={() => {
            setSelectedProfile(null);
            setCurrentView('grid');
          }}
          onVehicleSelect={setSelectedVehicle}
        />
      );
    }

    switch (currentView) {
      case 'messages':
        return <MessagesList />;
      case 'user-profile':
        return (
          <UserProfile 
            userId={user.id}
            onVehicleSelect={setSelectedVehicle}
            initialEditMode={editMode}
            onEditComplete={() => setEditMode(false)}
          />
        );
      case 'grid':
      default:
        return (
          <VehicleGrid 
            onVehicleSelect={setSelectedVehicle}
            searchQuery={searchQuery}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-8">
          <button 
            onClick={() => handleNavigation('grid')}
            className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity shrink-0"
          >
            <Gauge className="h-6 w-6" />
            <span className="inline-block">speed.app</span>
          </button>

          {currentView !== 'auth' && (
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search"
                  className="w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {user ? (
            <UserNav 
              onMessagesClick={() => handleNavigation('messages')} 
              onNewListingClick={() => setShowNewListing(true)}
              onProfileClick={() => handleNavigation('user-profile')}
            />
          ) : (
            currentView !== 'auth' && (
              <Button onClick={() => handleNavigation('auth')}>
                Sign In
              </Button>
            )
          )}
        </div>
      </header>

      <main className="container max-w-screen-2xl px-8 py-6">
        {renderContent()}
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