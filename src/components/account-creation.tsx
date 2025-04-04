import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { ImagePlus, Loader2, X } from 'lucide-react';

const vehicleSchema = z.object({
  bio: z.string().optional().nullable(),
  location: z.string().min(2, 'Location is required'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  price: z.number().min(0, 'Price must be positive'),
  mileage: z.number().min(0, 'Mileage must be positive').optional().nullable(),
  condition: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  fuel_type: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  features: z.array(z.string()).optional().nullable(),
  photos: z.array(z.string()).optional().nullable(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

type AccountCreationProps = {
  onComplete: () => void;
  initialData?: VehicleFormData & { id: string };
};

const CONDITIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'] as const;
const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'Semi-Automatic'] as const;
const FUEL_TYPES = ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid'] as const;

export function AccountCreation({ onComplete, initialData }: AccountCreationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  const { user } = useAuth();
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      ...initialData,
      year: initialData?.year || undefined,
      price: initialData?.price || undefined,
      mileage: initialData?.mileage || undefined,
      condition: initialData?.condition || undefined,
      transmission: initialData?.transmission || undefined,
      fuel_type: initialData?.fuel_type || undefined,
      color: initialData?.color || undefined,
      features: initialData?.features || [],
      photos: initialData?.photos || [],
    },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    try {
      setUploadingPhoto(true);
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
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      if (!data) throw new Error('Upload failed');

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(data.path);

      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);
      setValue('photos', newPhotos);
      toast.success('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const newPhotos = photos.filter((_, index) => index !== indexToRemove);
    setPhotos(newPhotos);
    setValue('photos', newPhotos);
  };

  const onSubmit = async (data: VehicleFormData) => {
    if (!user) {
      toast.error('You must be logged in to perform this action');
      return;
    }

    try {
      setIsLoading(true);

      const vehicleData = {
        owner_id: user.id,
        year: data.year,
        make: data.make,
        model: data.model,
        price: data.price,
        mileage: data.mileage || null,
        condition: data.condition || null,
        transmission: data.transmission || null,
        fuel_type: data.fuel_type || null,
        color: data.color || null,
        location: data.location,
        description: data.bio || null,
        features: data.features || [],
        photos,
      };

      let result;

      if (initialData?.id) {
        // Update existing vehicle
        result = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', initialData.id)
          .eq('owner_id', user.id)
          .select();
      } else {
        // Create new vehicle
        result = await supabase
          .from('vehicles')
          .insert([vehicleData])
          .select();
      }

      if (result.error) {
        console.error('Database operation failed:', result.error);
        
        if (result.error.code === 'PGRST301') {
          toast.error('Your session has expired. Please sign in again.');
          return;
        }
        
        throw result.error;
      }

      toast.success(initialData ? 'Vehicle updated successfully!' : 'Vehicle listed successfully!');
      onComplete();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(initialData ? 'Failed to update vehicle' : 'Failed to create vehicle listing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Vehicle' : 'List Your Vehicle'}</CardTitle>
        <CardDescription>
          {initialData ? 'Update your vehicle listing details' : 'Provide details about your vehicle to create a listing'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Photo Grid */}
            <div>
              <Label>Vehicle Photos</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photos.map((url, i) => (
                  <div key={i} className="aspect-square relative rounded-md overflow-hidden group">
                    <img src={url} alt={`Photo ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <label className="aspect-square flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors">
                    {uploadingPhoto ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ImagePlus className="h-6 w-6" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Upload up to 6 photos. First photo will be your listing's main image.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  {...register('year', { valueAsNumber: true })}
                  placeholder="2020"
                />
                {errors.year && (
                  <p className="text-sm text-destructive">{errors.year.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  placeholder="25000"
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  {...register('make')}
                  placeholder="Toyota"
                />
                {errors.make && (
                  <p className="text-sm text-destructive">{errors.make.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  {...register('model')}
                  placeholder="Camry"
                />
                {errors.model && (
                  <p className="text-sm text-destructive">{errors.model.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  {...register('mileage', { valueAsNumber: true })}
                  placeholder="50000"
                />
                {errors.mileage && (
                  <p className="text-sm text-destructive">{errors.mileage.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  {...register('color')}
                  placeholder="Silver"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select 
                  defaultValue={initialData?.condition || undefined}
                  onValueChange={(value) => setValue('condition', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition.toLowerCase()}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select 
                  defaultValue={initialData?.transmission || undefined}
                  onValueChange={(value) => setValue('transmission', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((transmission) => (
                      <SelectItem key={transmission} value={transmission.toLowerCase()}>
                        {transmission}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel_type">Fuel Type</Label>
              <Select 
                defaultValue={initialData?.fuel_type || undefined}
                onValueChange={(value) => setValue('fuel_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((fuelType) => (
                    <SelectItem key={fuelType} value={fuelType.toLowerCase()}>
                      {fuelType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="bio">Description</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Describe your vehicle's condition, history, and any special features..."
                className="min-h-[100px]"
              />
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (initialData ? 'Updating...' : 'Creating Listing...') : (initialData ? 'Update Listing' : 'List Vehicle')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}