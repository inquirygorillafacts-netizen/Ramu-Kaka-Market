import { ShoppingCart, Star, Apple, Carrot, Milk } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary overflow-hidden">
      <div className="relative w-48 h-48">
        <Apple className="w-8 h-8 text-red-500 absolute top-0 left-8 animate-add-to-cart" style={{animationDelay: '0s'}} />
        <Carrot className="w-8 h-8 text-orange-500 absolute top-8 left-0 animate-add-to-cart" style={{animationDelay: '0.3s'}} />
        <Milk className="w-8 h-8 text-blue-400 absolute top-2 left-20 animate-add-to-cart" style={{animationDelay: '0.6s'}} />
        
        <ShoppingCart className="w-24 h-24 text-primary absolute bottom-0 right-0 animate-cart-slide" />
      </div>
      <h1 className="mt-8 text-4xl md:text-6xl font-headline animate-fade-in-up" style={{animationDelay: '1s'}}>
        Ramu Kaka Market
      </h1>
    </div>
  );
}
