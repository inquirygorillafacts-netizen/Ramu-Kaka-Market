"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ShoppingCart, Shield } from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';

type UserRole = 'customer' | 'admin';

interface MockUser {
  name: string;
  roles: UserRole[];
  description: string;
  icon: React.ElementType;
}

const mockUsers: MockUser[] = [
  { name: 'Priya', roles: ['customer'], description: 'A returning customer.', icon: ShoppingCart },
  { name: 'Ravi', roles: ['admin'], description: 'An administrator.', icon: Shield },
  { name: 'Sonia', roles: ['customer', 'admin'], description: 'Both a customer and an admin.', icon: Users },
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const router = useRouter();

  const handleAnimationComplete = () => {
    setLoading(false);
  };

  useEffect(() => {
    if (selectedUser?.roles.length === 1) {
      router.push(`/${selectedUser.roles[0]}`);
    }
  }, [selectedUser, router]);

  const handleUserSelection = (user: MockUser) => {
    localStorage.setItem('ramukaka_user', JSON.stringify(user));
    setSelectedUser(user);
  };
  
  if (loading) {
    return <SplashScreen onAnimationComplete={handleAnimationComplete} />;
  }
  
  if (selectedUser?.roles.length > 1) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background animate-fade-in">
        <Card className="w-full max-w-md shadow-2xl animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-center">Welcome, {selectedUser.name}!</CardTitle>
            <CardDescription className="text-center">You have multiple roles. Please choose your destination.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {selectedUser.roles.map(role => (
              <Button key={role} onClick={() => router.push(`/${role}`)} className="w-full transition-transform hover:-translate-y-1" size="lg">
                Enter {role.charAt(0).toUpperCase() + role.slice(1)} Panel
              </Button>
            ))}
             <Button variant="outline" onClick={() => setSelectedUser(null)}>Back to user selection</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background animate-fade-in">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-headline text-primary">Ramu Kaka Market</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-xl md:text-2xl">Your friendly neighborhood online market.</p>
        <p className="mt-8 text-foreground/80">To demonstrate the app's features, please select a user profile to proceed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {mockUsers.map((user, index) => (
          <Card key={user.name} className="text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 animate-fade-in-up" style={{animationDelay: `${index * 150}ms`}}>
            <CardHeader>
              <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                 <user.icon className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-headline text-2xl">{user.name}</CardTitle>
              <CardDescription>{user.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleUserSelection(user)} className="w-full transition-transform hover:-translate-y-1 hover:shadow-lg">
                Login as {user.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
