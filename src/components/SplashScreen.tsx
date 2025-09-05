import { ShoppingCart, Star } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary overflow-hidden">
      <div className="relative">
        <Star className="w-8 h-8 text-yellow-400 absolute -top-4 -left-4 animate-item-drop" style={{animationDelay: '0.2s'}} />
        <Star className="w-6 h-6 text-yellow-400 absolute -top-8 right-0 animate-item-drop" style={{animationDelay: '0.5s'}} />
        <Star className="w-4 h-4 text-yellow-400 absolute -top-2 -right-6 animate-item-drop" style={{animationDelay: '0.8s'}} />
        
        <ShoppingCart className="w-24 h-24 text-primary animate-cart-bounce" />
      </div>
      <h1 className="mt-8 text-4xl md:text-6xl font-headline animate-fade-in-up">
        Ramu Kaka Market
      </h1>
    </div>
  );
}
