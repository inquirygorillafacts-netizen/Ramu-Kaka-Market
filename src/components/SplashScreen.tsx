import { ShoppingCart, Star, Apple, Carrot, Milk } from 'lucide-react';

export default function SplashScreen() {
  const name = "Ramu Kaka Market";
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white overflow-hidden relative">
      <div className="absolute inset-0 border-4 border-primary/50 animate-neon-glow rounded-2xl"></div>
      
      <div className="relative w-48 h-48 mb-8">
        <Apple className="w-8 h-8 text-red-400 absolute top-0 left-8 animate-fly-in-item" style={{animationDelay: '0s'}} />
        <Carrot className="w-8 h-8 text-orange-400 absolute top-8 left-0 animate-fly-in-item" style={{animationDelay: '0.3s'}} />
        <Milk className="w-8 h-8 text-blue-300 absolute top-2 left-20 animate-fly-in-item" style={{animationDelay: '0.6s'}} />
        <Star className="w-6 h-6 text-yellow-300 absolute -top-4 right-8 animate-fly-in-item" style={{animationDelay: '0.9s'}} />
        
        <ShoppingCart className="w-24 h-24 text-primary absolute bottom-0 right-0 animate-cart-bounce" />
      </div>

      <div className="font-headline text-4xl md:text-5xl tracking-wider animate-text-3d">
        <div className="animate-typing overflow-hidden whitespace-nowrap border-r-4 border-r-white pr-2">
            Ramu Kaka Market
        </div>
      </div>
       <p className="mt-4 text-lg text-primary/70 animate-fade-in" style={{ animationDelay: '3s' }}>
        Loading an experience...
      </p>
    </div>
  );
}
