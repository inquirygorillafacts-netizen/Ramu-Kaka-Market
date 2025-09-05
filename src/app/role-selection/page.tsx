
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, Loader2, Package, ShoppingCart, Truck, User, AlertTriangle } from 'lucide-react';
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
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            name: userData.name,
            email: firebaseUser.email,
            roles: userData.roles || {},
            photoUrl: userData.photoUrl,
          };
          setUser(profile);
          
          const rolesArray = Object.keys(profile.roles);
          setUserRoles(rolesArray);

          // Dynamic redirection logic
          if (rolesArray.length === 1 && rolesArray[0] === 'customer') {
            router.replace('/customer');
          } else {
            // This will show the selection page for users with >1 role,
            // or the "no roles" message for users with 0 roles.
            setLoading(false);
          }

        } else {
          // User exists in Auth but not in Firestore, redirect to auth to be safe
          await auth.signOut();
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
        <p className="mt-4 text-muted-foreground">Verifying your roles...</p>
      </div>
    );
  }

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
          
          {userRoles.length > 0 ? (
            <p className="text-muted-foreground text-lg mt-1">Please select a gate to enter.</p>
          ) : (
             <p className="text-muted-foreground text-lg mt-1">You have no roles assigned.</p>
          )}
      </div>
      
      {userRoles.length > 0 ? (
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
      ) : (
         <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
            <CardHeader className="items-center">
                <AlertTriangle className="w-12 h-12 text-destructive"/>
                <CardTitle className="text-destructive">No Access</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-destructive/80">
                    You do not have any roles assigned to your account. Please contact an administrator to get access.
                </p>
            </CardContent>
         </Card>
      )}
    </main>
  );
}
