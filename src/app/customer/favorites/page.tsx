'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function FavoritesPage() {
  const router = useRouter();
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="animate-fade-in-down">
          <div className="flex items-center gap-4">
              <Heart className="w-8 h-8 text-primary"/>
              <h1 className="text-3xl font-bold font-headline text-primary">Your Favorites</h1>
          </div>
          <p className="text-muted-foreground mt-1">The products you love, all in one place.</p>
      </header>
       <div className="text-center py-20 flex flex-col items-center animate-fade-in-up">
            <Heart className="w-24 h-24 text-muted-foreground/30 mb-4"/>
            <h2 className="text-xl font-semibold">No Favorites Yet</h2>
            <p className="text-muted-foreground mt-2">Tap the heart on any product to save it here.</p>
            <Button onClick={() => router.push('/customer')} className="mt-6">Discover Products</Button>
        </div>
    </div>
  );
}
