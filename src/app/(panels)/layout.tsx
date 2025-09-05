
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LayoutDashboard, Settings, ShoppingCart, Users, Package, LogOut, Truck } from "lucide-react";
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
import { Loader2 } from "lucide-react";
import { UserProfile } from "@/lib/types";


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
            id: firebaseUser.uid,
            name: userData.name,
            email: firebaseUser.email,
            roles: userData.roles || { customer: true },
            photoUrl: userData.photoUrl,
          };
          setUser(profile);
          
          const currentPanel = pathname.split('/')[1];

          // Customer panel is no longer under this layout, so we don't check for it.
          const validPanels = ['admin', 'delivery', 'role-selection'];
          const userRoles = Object.keys(profile.roles);

          if (validPanels.includes(currentPanel) && !userRoles.includes(currentPanel) && currentPanel !== 'role-selection') {
              toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: `You do not have permission to access the ${currentPanel} panel.`
              })
              router.push('/role-selection');
          } else {
            setLoading(false);
          }

        } else {
          // This case might happen if user is deleted from firestore but not auth
          await signOut(auth);
          router.push('/auth');
        }
      } else {
        router.push('/auth');
      }
    });

    return () => unsubscribe();
  }, [pathname, router, toast]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/auth');
    } catch (error) {
      toast({ variant: "destructive", title: "Logout Failed", description: "Something went wrong." });
    }
  };

  const getInitials = (name: string = "") => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const getCurrentPanelTitle = () => {
      const currentPanel = pathname.split('/').filter(Boolean)[0];
      if (!currentPanel || currentPanel === 'role-selection') return "Dashboard";
      return currentPanel.charAt(0).toUpperCase() + currentPanel.slice(1) + " Panel";
  }


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Verifying access...</span>
        </div>
      </div>
    );
  }

  const currentPanel = pathname.split('/')[1];

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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={true}>
                    <Link href={`/${currentPanel}`}>
                      {currentPanel === 'admin' && <LayoutDashboard />}
                      {currentPanel === 'delivery' && <Truck />}
                       {currentPanel !== 'admin' && currentPanel !== 'delivery' && <Home />}
                      <span className="truncate">{getCurrentPanelTitle()}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                  <span className="text-xs text-muted-foreground">{Object.keys(user.roles).map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}</span>
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
                  <Link href="/role-selection">
                    <Home />
                    <span>Back to Gates</span>
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
                  {pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? "Dashboard"}
                </h1>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
          </header>
          <main className="flex-1 p-4 md:p-6 animate-fade-in-up">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
