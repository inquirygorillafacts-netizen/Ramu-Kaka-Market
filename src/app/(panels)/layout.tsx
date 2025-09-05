
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutDashboard, Settings, ShoppingCart, Users, Package, LogOut } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React, { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  roles: string[];
  photoUrl?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
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
            roles: userData.roles || ['customer'],
            photoUrl: userData.photoUrl,
          };
          setUser(profile);
          
          const currentPanel = pathname.split('/')[1];
          if (!profile.roles.includes(currentPanel)) {
              // If user tries to access a panel they don't have a role for, redirect them
              router.push(`/${profile.roles[0]}`);
          }

        } else {
          // No user data in Firestore, something is wrong
          await signOut(auth);
          router.push('/auth');
        }
      } else {
        // Not logged in
        router.push('/auth');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('ramukaka_user');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/auth');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Failed", description: "Something went wrong." });
    }
  };

  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const userRoles = user?.roles || [];
  const canSeeCustomer = userRoles.includes('customer');
  const canSeeAdmin = userRoles.includes('admin');
  const canSeeDelivery = userRoles.includes('delivery');


  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                <Package className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight font-headline text-primary group-data-[collapsible=icon]:hidden">
                Ramu Kaka Market
              </h2>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {canSeeCustomer && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/customer"}>
                    <Link href="/customer">
                      <ShoppingCart />
                      <span className="truncate">Customer Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {canSeeAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/admin"}>
                    <Link href="/admin">
                      <LayoutDashboard />
                      <span className="truncate">Admin Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
               {/* Placeholder for Delivery Panel */}
              {canSeeDelivery && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/delivery"}>
                    <Link href="/delivery">
                      <Users />
                      <span className="truncate">Delivery Panel</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="space-y-2">
            {user && (
              <div className="flex items-center gap-3 p-2">
                <Avatar>
                  <AvatarImage data-ai-hint="person portrait" src={user.photoUrl || `https://picsum.photos/seed/${user.name}/40`} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold text-sm">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.roles.join(', ')}</span>
                </div>
              </div>
            )}
            <SidebarMenu>
               <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout}>
                    <LogOut />
                    <span>Logout</span>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Home />
                    <span>Back to Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
              <SidebarTrigger className="md:hidden"/>
              <div className="flex-1">
                <h1 className="text-xl font-semibold capitalize font-headline">
                  {pathname.split('/').filter(Boolean).pop()?.replace('-', ' ') ?? "Dashboard"}
                </h1>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
          </header>
          <main className="flex-1 p-4 md:p-6 animate-fade-in">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
