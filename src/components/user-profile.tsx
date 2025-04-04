import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { ChevronLeft, Pencil, Trash2, User, Phone, Mail, MapPin, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VehicleGrid } from './dog-grid';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/utils';

type Profile = {
  id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  show_email: boolean;
  show_phone: boolean;
};

type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
};

type UserProfileProps = {
  userId: string;
  onBack?: () => void;
  onVehicleSelect?: (id: string) => void;
  initialEditMode?: boolean;
  onEditComplete?: () => void;
};

const profileSchema = z.object({
  display_name: z.string().min(2, 'Display name must be at least 2 characters').optional().nullable(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().nullable(),
  location: z.string().min(2, 'Location must be at least 2 characters').optional().nullable(),
  phone_number: z.string()
    .refine(val => !val || /^\(\d{3}\) \d{3} \d{4}$/.test(val), 'Invalid phone number format')
    .optional()
    .nullable(),
  show_email: z.boolean().default(false),
  show_phone: z.boolean().default(false),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function UserProfile({ userId, onBack, onVehicleSelect, initialEditMode = false, onEditComplete }: UserProfileProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(initialEditMode);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; vehicle: Vehicle | null }>({
    open: false,
    vehicle: null,
  });
  const isOwnProfile = user?.id === userId;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      show_email: false,
      show_phone: false,
    }
  });

  useEffect(() => {
    setEditMode(initialEditMode);
  }, [initialEditMode]);

  const showEmail = watch('show_email');
  const showPhone = watch('show_phone');

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      reset({
        display_name: profileData.display_name || null,
        bio: profileData.bio || null,
        location: profileData.location || null,
        phone_number: profileData.phone_number ? formatPhoneNumber(profileData.phone_number) : null,
        show_email: profileData.show_email || false,
        show_phone: profileData.show_phone || false,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    try {
      setUploadingAvatar(true);
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar.${fileExt}`;
      
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-photos')
            .remove([`${user?.id}/${oldPath}`]);
        }
      }
      
      const { error: uploadError, data } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      if (!data) throw new Error('Upload failed');

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(data.path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Vehicle deleted successfully');
      setDeleteDialog({ open: false, vehicle: null });
      window.location.reload();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name || null,
          bio: data.bio || null,
          location: data.location || null,
          phone_number: data.phone_number ? normalizePhoneNumber(data.phone_number) : null,
          show_email: data.show_email,
          show_phone: data.show_phone,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setEditMode(false);
      onEditComplete?.();
      loadProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    e.target.value = formattedNumber;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-muted rounded-lg"></div>
        <div className="h-40 bg-muted rounded-lg"></div>
      </div>
    );
  }

  if (editMode && isOwnProfile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} className="-ml-2">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 mb-6">
              <Avatar className="h-24 w-24 cursor-pointer relative group rounded-lg">
                <AvatarImage src={profile?.avatar_url || undefined} className="rounded-lg" />
                <AvatarFallback className="rounded-lg">
                  <User className="h-12 w-12" />
                </AvatarFallback>
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-white" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </Avatar>
              <p className="text-sm text-muted-foreground">
                Click to upload profile picture
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name (Business/Dealer Name)</Label>
                <Input
                  id="display_name"
                  {...register('display_name')}
                  placeholder="Detroit Throttle Customs"
                />
                {errors.display_name && (
                  <p className="text-sm text-destructive">{errors.display_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="City, State"
                />
                {errors.location && (
                  <p className="text-sm text-destructive">{errors.location.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder="Tell others about yourself or your business..."
                />
                {errors.bio && (
                  <p className="text-sm text-destructive">{errors.bio.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  {...register('phone_number')}
                  placeholder="(555) 123 4567"
                  onChange={handlePhoneChange}
                  maxLength={14}
                />
                {errors.phone_number && (
                  <p className="text-sm text-destructive">{errors.phone_number.message}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_email">Show Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your email address on your public profile
                    </p>
                  </div>
                  <Switch
                    id="show_email"
                    checked={showEmail}
                    onCheckedChange={(checked) => setValue('show_email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show_phone">Show Phone Number</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your phone number on your public profile
                    </p>
                  </div>
                  <Switch
                    id="show_phone"
                    checked={showPhone}
                    onCheckedChange={(checked) => setValue('show_phone', checked)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-lg">
              <AvatarImage src={profile?.avatar_url || undefined} className="rounded-lg" />
              <AvatarFallback className="rounded-lg">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    {profile?.display_name || ''}
                  </CardTitle>
                </div>
                {isOwnProfile && (
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {profile?.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{profile.location}</span>
              </div>
            )}
            {profile?.show_email && user?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${user.email}`} className="hover:underline">
                  {user.email}
                </a>
              </div>
            )}
            {profile?.show_phone && profile?.phone_number && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${profile.phone_number}`} className="hover:underline">
                  {formatPhoneNumber(profile.phone_number)}
                </a>
              </div>
            )}
          </div>

          {profile?.bio && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-medium">About</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <VehicleGrid 
        onVehicleSelect={onVehicleSelect || (() => {})}
        userId={userId}
        onDeleteVehicle={(vehicle) => setDeleteDialog({ open: true, vehicle })}
      />

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, vehicle: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your {deleteDialog.vehicle?.year} {deleteDialog.vehicle?.make} {deleteDialog.vehicle?.model} listing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteDialog({ open: false, vehicle: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.vehicle && handleDeleteVehicle(deleteDialog.vehicle.id)}
            >
              Delete Listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}