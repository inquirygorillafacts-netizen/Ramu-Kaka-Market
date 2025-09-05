
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Lock } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);

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
          <form className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="relative">
                         <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input id="name" type="text" placeholder="e.g. Priya Sharma" required className="pl-10" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="number">Mobile Number</Label>
                    <div className="relative">
                         <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input id="number" type="tel" placeholder="e.g. 9876543210" required className="pl-10" />
                    </div>
                </div>
              </>
            )}
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="e.g. priya@example.com" required className="pl-10"/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="Create a strong password" required className="pl-10"/>
                </div>
            </div>
            <Button type="submit" className="w-full">
              {isLogin ? 'Login' : 'Register'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="px-1">
              {isLogin ? 'Register' : 'Login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
