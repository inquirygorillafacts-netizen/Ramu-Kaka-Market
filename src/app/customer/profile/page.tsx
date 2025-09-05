'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Camera, Save, MapPin, Phone, Home, Hash, CreditCard, Globe } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserProfile } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';


export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    mobile: '',
    village: '',
    address: '',
    pincode: '',
    mapLat: '',
    mapLng: '',
    paymentMethod: 'COD',
    photoUrl: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if(user) {
            setCurrentUser(user);
            // Fetch Firebase profile
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const firebaseProfile: Partial<UserProfile> = userDoc.exists() ? userDoc.data() : {};
            
            // Load local profile
            const savedProfile = localStorage.getItem('ramukaka_profile');
            const localProfile: Partial<UserProfile> = savedProfile ? JSON.parse(savedProfile) : {};

            // Merge profiles - Firebase data takes precedence for name and map, rest is local
            const mergedProfile = {
                ...localProfile,
                name: firebaseProfile.name || localProfile.name || '',
                photoUrl: firebaseProfile.photoUrl || localProfile.photoUrl || '',
                mapLat: firebaseProfile.mapLat || localProfile.mapLat || '',
                mapLng: firebaseProfile.mapLng || localProfile.mapLng || '',
            };

            setProfile(mergedProfile);
            setPhotoPreview(mergedProfile.photoUrl || null);

        } else {
            // Handle logged out state if necessary
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setProfile((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (value: 'COD' | 'Online') => {
    setProfile((prev) => ({...prev, paymentMethod: value}));
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if(!currentUser) {
        toast({variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to save your profile.'});
        return;
    }
    setSaving(true);
    try {
        const firebaseData: Partial<UserProfile> = {
            name: profile.name,
            mapLat: profile.mapLat,
            mapLng: profile.mapLng,
        };
        // In a real app, photo would be uploaded and URL updated in firebase too.
        // For now, we only update name and map coords.
        await updateDoc(doc(db, 'users', currentUser.uid), firebaseData);
        
        // Save other fields locally
        localStorage.setItem('ramukaka_profile', JSON.stringify({
            ...profile,
            name: firebaseData.name // ensure local name is also updated
        }));
        
        toast({
          title: 'Profile Saved!',
          description: 'Your information has been updated.',
        });

    } catch (error) {
        console.error("Error saving profile:", error);
        toast({variant: 'destructive', title: 'Error', description: 'Could not save your profile.'});
    } finally {
        setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="animate-fade-in-down">
          <div className="flex items-center gap-4">
              <UserIcon className="w-8 h-8 text-primary"/>
              <h1 className="text-3xl font-bold font-headline text-primary">Your Profile</h1>
          </div>
          <p className="text-muted-foreground mt-1">Manage your personal and delivery information.</p>
      </header>

      <div className="space-y-6 bg-card p-6 rounded-xl shadow-sm animate-fade-in-up">
        <div className="flex flex-col items-center space-y-4">
            <div className="relative group">
                <Avatar className="w-28 h-28 border-4 border-primary/20">
                    <AvatarImage src={photoPreview || undefined} alt={profile.name} />
                    <AvatarFallback className="text-3xl bg-primary/10">{profile.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Label htmlFor="photo-upload" className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-8 h-8"/>
                </Label>
                <Input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={saving}/>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" value={profile.name} onChange={handleChange} placeholder="e.g. Priya Sharma" className="pl-10" disabled={saving}/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                 <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="mobile" value={profile.mobile} onChange={handleChange} placeholder="e.g. 9876543210" className="pl-10" disabled={saving}/>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="village">Village/Town Name</Label>
                 <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="village" value={profile.village} onChange={handleChange} placeholder="e.g. Rampur" className="pl-10" disabled={saving}/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">Full Address (House, Street etc.)</Label>
                 <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="address" value={profile.address} onChange={handleChange} placeholder="e.g. 123, Ganga Nagar" className="pl-10" disabled={saving}/>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                 <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="pincode" value={profile.pincode} onChange={handleChange} placeholder="e.g. 110011" className="pl-10" disabled={saving}/>
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="paymentMethod">Preferred Payment</Label>
                 <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Select value={profile.paymentMethod} onValueChange={handleSelectChange} disabled={saving}>
                        <SelectTrigger className="pl-10">
                            <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                            <SelectItem value="Online">Online Payment</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mapLat">Google Map Coordinates (Optional)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="mapLat" value={profile.mapLat} onChange={handleChange} placeholder="Latitude" className="pl-10" disabled={saving}/>
                    </div>
                     <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="mapLng" value={profile.mapLng} onChange={handleChange} placeholder="Longitude" className="pl-10" disabled={saving}/>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex justify-end">
            <Button onClick={handleSave} className="h-11" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Save className="mr-2 h-5 w-5"/>}
                {saving ? 'Saving...' : 'Save Changes'}
            </Button>
        </div>
      </div>
    </div>
  );
}
