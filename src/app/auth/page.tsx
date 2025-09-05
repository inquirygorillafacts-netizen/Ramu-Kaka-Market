
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Lock, Image as ImageIcon, Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import Image from 'next/image';

const IMGBB_API_KEY = '43d1267c74925ed8af33485644bfaa6b';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        return result.data.url;
      } else {
        throw new Error(result.error.message || 'Image upload failed');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Image Upload Failed',
        description: error.message || 'Could not upload image to ImgBB.',
      });
      return null;
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.mobile || !formData.email || !formData.password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill all fields for registration.',
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak Password',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    setIsLoading(true);

    let photoUrl = '';
    if (photoFile) {
      const uploadedUrl = await handleImageUpload(photoFile);
      if (!uploadedUrl) {
        setIsLoading(false);
        return; // Stop registration if image upload fails
      }
      photoUrl = uploadedUrl;
    }

    try {
      // Check if this is the first user
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, limit(1));
      const snapshot = await getDocs(q);
      const isFirstUser = snapshot.empty;

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const userRoles: { [key: string]: any } = { customer: true };
      if (isFirstUser) {
        userRoles.admin = { adminId: 'ADM-INITIAL' };
        toast({
            title: "Congratulations!",
            description: "You are the first user, so you have been made an Admin.",
            duration: 5000,
        });
      }


      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        photoUrl: photoUrl,
        roles: userRoles,
      });

      localStorage.setItem('ramukaka_user', JSON.stringify({
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        roles: userRoles,
      }));
      
      toast({
        title: 'Success!',
        description: 'You have successfully registered.',
      });
      router.push('/role-selection');

    } catch (error: any) {
       if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: 'This email is already registered. Please log in.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Email and password are required.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRoles = userData.roles || { customer: true };

        localStorage.setItem('ramukaka_user', JSON.stringify({
          uid: user.uid,
          name: userData.name,
          email: user.email,
          roles: userRoles,
        }));
        
        toast({
          title: 'Success!',
          description: 'You have successfully logged in.',
        });

        router.push('/role-selection');

      } else {
        throw new Error("User data not found in database.");
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
      <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm border-primary/20 shadow-2xl animate-fade-in-down">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline text-primary">
            {isLogin ? 'Welcome Back!' : 'Create an Account'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Log in to continue to Ramu Kaka Market.' : 'Join us and start shopping!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="flex justify-center">
                    <div className="relative group">
                        <Label htmlFor="photo-upload" className="cursor-pointer">
                            <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-muted-foreground/50 flex items-center justify-center overflow-hidden transition-colors group-hover:border-primary group-hover:bg-muted/80">
                                {photoPreview ? (
                                    <Image src={photoPreview} alt="Preview" width={96} height={96} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="flex flex-col items-center">
                                      <Camera className="w-8 h-8 text-muted-foreground/80 transition-colors group-hover:text-primary" />
                                      <span className="text-xs mt-1 text-muted-foreground">Add Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </Label>
                        <Input id="photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={isLoading} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="relative">
                         <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input id="name" type="text" placeholder="e.g. Priya Sharma" required className="pl-10" value={formData.name} onChange={handleChange} disabled={isLoading} />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <div className="relative">
                         <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input id="mobile" type="tel" placeholder="e.g. 9876543210" required className="pl-10" value={formData.mobile} onChange={handleChange} disabled={isLoading} />
                    </div>
                </div>
              </>
            )}
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="e.g. priya@example.com" required className="pl-10" value={formData.email} onChange={handleChange} disabled={isLoading}/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="Create a strong password" required className="pl-10" value={formData.password} onChange={handleChange} disabled={isLoading}/>
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? (isLogin ? 'Logging in...' : 'Registering...') : (isLogin ? 'Login' : 'Register')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="px-1" disabled={isLoading}>
              {isLogin ? 'Register' : 'Login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
