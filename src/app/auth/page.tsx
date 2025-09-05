
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Email and password are required.',
      });
      return;
    }
    if (!isLogin && (!formData.name || !formData.mobile)) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Please fill all fields for registration.',
        });
        return;
    }

    // In a real app, this is where you'd call Firebase Auth
    console.log(`${isLogin ? 'Logging in' : 'Registering'} user:`, formData);
    
    // Mock user object for demonstration
    const mockUser = {
      name: isLogin ? 'Priya' : formData.name, // Use a default name on login for now
      roles: ['customer'], // Default role
    };

    // Store mock user in localStorage to simulate session
    localStorage.setItem('ramukaka_user', JSON.stringify(mockUser));
    
    toast({
      title: `Success!`,
      description: `You have successfully ${isLogin ? 'logged in' : 'registered'}.`,
    });

    // Redirect to the customer dashboard
    router.push('/customer');
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
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="relative">
                         <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input id="name" type="text" placeholder="e.g. Priya Sharma" required className="pl-10" value={formData.name} onChange={handleChange} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <div className="relative">
                         <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input id="mobile" type="tel" placeholder="e.g. 9876543210" required className="pl-10" value={formData.mobile} onChange={handleChange} />
                    </div>
                </div>
              </>
            )}
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                 <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="e.g. priya@example.com" required className="pl-10" value={formData.email} onChange={handleChange}/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="Create a strong password" required className="pl-10" value={formData.password} onChange={handleChange}/>
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
