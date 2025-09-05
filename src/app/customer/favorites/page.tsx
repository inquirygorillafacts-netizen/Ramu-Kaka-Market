'use client';

import { useState, useEffect } from 'react';
import { Heart, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Product } from '@/lib/types';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function FavoritesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Product[]>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('ramukaka_favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);
  
  const handleRemoveFavorite = (productId: string) => {
    const newFavorites = favorites.filter(fav => fav.id !== productId);
    setFavorites(newFavorites);
    localStorage.setItem('ramukaka_favorites', JSON.stringify(newFavorites));
    toast({
      title: 'Removed from Favorites',
    });
  };
  
  const handleAddToCart = (product: Product) => {
     const cart = JSON.parse(localStorage.getItem('ramukaka_cart') || '[]');
     const existingItem = cart.find((item: Product) => item.id === product.id);
     if (existingItem) {
       existingItem.quantity += 1;
     } else {
       cart.push({ ...product, quantity: 1 });
     }
     localStorage.setItem('ramukaka_cart', JSON.stringify(cart));
     toast({
       title: 'Added to Tokri',
       description: `${product.name} has been added to your tokri.`,
     });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="animate-fade-in-down">
          <div className="flex items-center gap-4">
              <Heart className="w-8 h-8 text-primary"/>
              <h1 className="text-3xl font-bold font-headline text-primary">Your Favorites</h1>
          </div>
          <p className="text-muted-foreground mt-1">The products you love, all in one place.</p>
      </header>
      
      {favorites.length === 0 ? (
         <div className="text-center py-20 flex flex-col items-center animate-fade-in-up">
            <Heart className="w-24 h-24 text-muted-foreground/30 mb-4"/>
            <h2 className="text-xl font-semibold">No Favorites Yet</h2>
            <p className="text-muted-foreground mt-2">Tap the heart on any product to save it here.</p>
            <Button onClick={() => router.push('/customer')} className="mt-6">Discover Products</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in-up">
          {favorites.map(product => (
            <div key={product.id} className="relative bg-card rounded-xl shadow-sm overflow-hidden group border">
              <button 
                onClick={() => handleRemoveFavorite(product.id)}
                className="absolute top-2 right-2 z-10 p-1.5 bg-background/70 backdrop-blur-sm rounded-full"
              >
                  <Heart className="w-5 h-5 text-destructive fill-destructive"/>
              </button>
                
              <div className="aspect-square overflow-hidden">
                <Image 
                  src={product.images[0]} 
                  alt={product.name} 
                  width={200} 
                  height={200} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.unit}</p>
                <div className="flex justify-between items-center">
                  <div className="font-bold text-base">
                    {product.discountPrice ? (
                        <div className="flex items-baseline gap-1.5">
                            <span>₹{product.discountPrice.toFixed(2)}</span>
                            <span className="text-sm line-through text-muted-foreground">₹{product.price.toFixed(2)}</span>
                        </div>
                    ) : `₹${product.price.toFixed(2)}`}
                  </div>
                </div>
                 <Button className="w-full h-9" onClick={() => handleAddToCart(product)}>
                   <ShoppingBasket className="w-4 h-4 mr-2"/>
                   Add
                 </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
