
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Loader2, Package, ShoppingCart, Truck, User } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  roles: { [key: string]: any };
  photoUrl?: string;
}

export default function RoleSelectionPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            name: userData.name,
            email: firebaseUser.email,
            roles: userData.roles || { customer: true },
            photoUrl: userData.photoUrl,
          };
          setUser(profile);

          const userRoles = profile.roles ? Object.keys(profile.roles) : [];
          if (userRoles.length === 1 && userRoles[0] === 'customer') {
            router.replace('/customer');
          } else {
            setLoading(false);
          }
        } else {
          // User exists in Auth but not in Firestore, redirect to auth to be safe
          router.replace('/auth');
        }
      } else {
        // Not logged in
        router.replace('/auth');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your gates...</p>
      </div>
    );
  }

  const userRoles = user.roles ? Object.keys(user.roles) : [];

  const roleConfig = {
      customer: { icon: ShoppingCart, name: "Customer", path: "/customer", description: "Shop for fresh products" },
      admin: { icon: LayoutDashboard, name: "Admin", path: "/admin", description: "Manage the marketplace" },
      delivery: { icon: Truck, name: "Delivery", path: "/delivery", description: "Manage your deliveries" }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background animate-fade-in">
        <div className="text-center mb-8">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary/50">
                <AvatarImage src={user.photoUrl} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-headline text-primary">Welcome, {user.name}!</h1>
            <p className="text-muted-foreground text-lg mt-1">Please select a gate to enter.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        {userRoles.map((role) => {
            const config = roleConfig[role as keyof typeof roleConfig];
            if (!config) return null;

            return (
                <Link href={config.path} key={role} legacyBehavior>
                    <a className="block transform hover:-translate-y-1 transition-transform duration-300">
                        <Card className="text-center hover:shadow-2xl hover:border-primary/50 transition-all duration-300 h-full">
                            <CardHeader>
                                <div className="flex justify-center items-center mb-4">
                                    <div className="p-4 bg-primary/10 rounded-full">
                                        <config.icon className="w-10 h-10 text-primary"/>
                                    </div>
                                </div>
                                <CardTitle className="font-headline">{config.name} Panel</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{config.description}</p>
                            </CardContent>
                        </Card>
                    </a>
                </Link>
            )
        })}
      </div>
    </main>
  );
}
