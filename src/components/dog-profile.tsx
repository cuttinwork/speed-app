import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { ChevronLeft, MessageSquare, Shield, User, Pencil, Mail, Phone } from "lucide-react";
import { Separator } from "./ui/separator";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { ChatWindow } from "./chat-window";
import { Badge } from "./ui/badge";
import { formatCurrency, formatNumber, formatPhoneNumber } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useAuth } from "@/lib/auth";
import { AccountCreation } from "./account-creation";
import { toast } from "sonner";

type VehicleProfileProps = {
  dogId: string;
  onBack: () => void;
  onProfileSelect?: (id: string) => void;
};

type Vehicle = {
  id: string;
  owner_id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  condition: string;
  transmission: string;
  fuel_type: string;
  color: string;
  location: string;
  description: string | null;
  photos: string[];
  features: string[] | null;
  owner: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    location: string | null;
    email: string | null;
    phone_number: string | null;
    show_email: boolean;
    show_phone: boolean;
  };
};

export function VehicleProfile({ dogId: vehicleId, onBack, onProfileSelect }: VehicleProfileProps) {
  const { user, refreshSession } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const isOwner = vehicle?.owner_id === user?.id;

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  async function loadVehicle() {
    try {
      // Only refresh session if user is logged in
      if (user) {
        await refreshSession();
      }
      
      // Get the vehicle and owner data
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select(`
          *,
          owner:profiles!vehicles_owner_id_fkey (
            id,
            display_name,
            avatar_url,
            location,
            email,
            phone_number,
            show_email,
            show_phone
          )
        `)
        .eq('id', vehicleId)
        .single();

      if (vehicleError) throw vehicleError;

      setVehicle(vehicleData);
    } catch (error) {
      console.error('Error loading vehicle:', error);
      toast.error('Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  }

  if (loading || !vehicle) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-32 bg-muted rounded mb-4"></div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square bg-muted rounded"></div>
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted rounded"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
            <div className="h-24 w-full bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (editMode) {
    const formData = {
      id: vehicle.id,
      bio: vehicle.description,
      location: vehicle.location,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      price: vehicle.price,
      mileage: vehicle.mileage,
      condition: vehicle.condition,
      transmission: vehicle.transmission,
      fuel_type: vehicle.fuel_type,
      color: vehicle.color,
      features: vehicle.features,
      photos: vehicle.photos,
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setEditMode(false)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Vehicle Listing</h1>
        </div>
        
        <AccountCreation 
          initialData={formData}
          onComplete={async () => {
            setEditMode(false);
            await loadVehicle();
            toast.success('Vehicle updated successfully');
          }} 
        />
      </div>
    );
  }

  const fallbackImage = `https://source.unsplash.com/800x800/?${encodeURIComponent(`${vehicle.make} ${vehicle.model} car`.trim())}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <div className="aspect-[4/3] relative bg-muted flex items-center justify-center overflow-hidden">
            <img
              src={vehicle.photos?.[currentPhotoIndex] || fallbackImage}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="lazy"
            />
          </div>
          {vehicle.photos && vehicle.photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2 p-2">
              {vehicle.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`aspect-[4/3] relative rounded-lg overflow-hidden bg-muted ${
                    index === currentPhotoIndex ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Additional photo ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold">{formatCurrency(vehicle.price)}</h2>
              <p className="text-muted-foreground">
                {vehicle.condition} • {vehicle.location}
              </p>
            </div>
            <div className="flex gap-2">
              {isOwner ? (
                <Button onClick={() => setEditMode(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Listing
                </Button>
              ) : (
                <>
                  <Button size="icon" variant="outline">
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setChatOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Seller
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <button
              className="w-full text-left"
              onClick={() => onProfileSelect?.(vehicle.owner.id)}
            >
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={vehicle.owner.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {vehicle.owner.display_name || ''}
                    </p>
                    {vehicle.owner.location && (
                      <p className="text-sm text-muted-foreground">{vehicle.owner.location}</p>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                {(vehicle.owner.show_email || vehicle.owner.show_phone) && (
                  <div className="flex flex-col items-end gap-2 pl-4 border-l border-border">
                    {vehicle.owner.show_email && vehicle.owner.email && (
                      <a 
                        href={`mailto:${vehicle.owner.email}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-4 w-4" />
                        {vehicle.owner.email}
                      </a>
                    )}
                    {vehicle.owner.show_phone && vehicle.owner.phone_number && (
                      <a 
                        href={`tel:${vehicle.owner.phone_number}`}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-4 w-4" />
                        {formatPhoneNumber(vehicle.owner.phone_number)}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </button>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{vehicle.year}</div>
                <div className="text-sm text-muted-foreground">Year</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatNumber(vehicle.mileage)}</div>
                <div className="text-sm text-muted-foreground">Miles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold capitalize">{vehicle.transmission || '—'}</div>
                <div className="text-sm text-muted-foreground">Transmission</div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <div className="grid grid-cols-2 gap-y-2">
                <div>
                  <span className="text-muted-foreground">Make:</span>
                  <span className="ml-2">{vehicle.make}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <span className="ml-2">{vehicle.model}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Color:</span>
                  <span className="ml-2">{vehicle.color || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Fuel:</span>
                  <span className="ml-2 capitalize">{vehicle.fuel_type || '—'}</span>
                </div>
              </div>
            </div>

            {vehicle.description && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{vehicle.description}</p>
                </div>
              </>
            )}

            {vehicle.features && vehicle.features.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.features.map((feature, i) => (
                      <Badge key={i} variant="secondary">{feature}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <p className="text-muted-foreground">{vehicle.location}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogTitle className="sr-only">Chat with Seller</DialogTitle>
          <ChatWindow
            otherUserId={vehicle.owner.id}
            otherUserName={vehicle.owner.display_name || ''}
            otherUserAvatar={vehicle.owner.avatar_url || undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}