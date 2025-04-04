import { useState, useEffect } from 'react';
import { Card } from "./ui/card";
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
import { Pencil, Trash2 } from 'lucide-react';

type Vehicle = {
  id: string;
  owner_id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  condition: string;
  location: string;
  photos: string[];
  owner: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

type VehicleGridProps = {
  onVehicleSelect: (id: string) => void;
  userId?: string;
  onDeleteVehicle?: (vehicle: Vehicle) => void;
  searchQuery?: string;
};

export function VehicleGrid({ onVehicleSelect, userId, onDeleteVehicle, searchQuery }: VehicleGridProps) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    loadVehicles();
  }, [userId, searchQuery]);

  async function loadVehicles() {
    try {
      let query = supabase
        .from('vehicles')
        .select(`
          *,
          owner:profiles!vehicles_owner_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('owner_id', userId);
      }

      if (searchQuery?.trim()) {
        query = query.or(
          `make.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const vehiclesWithUrls = data?.map(vehicle => ({
        ...vehicle,
        photos: vehicle.photos?.map((photo: string) => {
          if (photo.startsWith('http')) return photo;
          const { data: { publicUrl } } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(photo);
          return publicUrl;
        }) || [],
      }));

      setVehicles(vehiclesWithUrls || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="aspect-[4/5] animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {userId ? (isOwnProfile ? 'My Listings' : 'Listings') : 'Available Vehicles'}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {vehicles.map((vehicle) => {
          const mainImage = vehicle.photos?.[0] || 
            `https://source.unsplash.com/800x800/?${encodeURIComponent(`${vehicle.make} ${vehicle.model} car`.trim())}`;

          return (
            <Card
              key={vehicle.id}
              className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onVehicleSelect(vehicle.id)}
            >
              <div className="flex flex-col h-full">
                <div className="aspect-[4/3] relative bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={mainImage}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                  {isOwnProfile && onDeleteVehicle && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-t-lg">
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVehicleSelect(vehicle.id);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteVehicle(vehicle);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="p-4 space-y-2">
                  <p className="text-xl font-semibold">
                    {formatCurrency(vehicle.price)}
                  </p>
                  <p className="text-base">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground gap-1">
                    <span className="truncate">{vehicle.location}</span>
                    {vehicle.mileage && (
                      <>
                        <span>•</span>
                        <span>{formatNumber(vehicle.mileage)} mi</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {userId ? (isOwnProfile ? 'You haven\'t listed any vehicles yet' : 'No vehicles listed') : 'No vehicles available'}
          </div>
        )}
      </div>
    </div>
  );
}