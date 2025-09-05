import { ShoppingCart, Star, Apple, Carrot, Milk } from 'lucide-react';

export default function SplashScreen() {
  const name = "Ramu Kaka Market";
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground overflow-hidden">
      <div className="relative w-48 h-48 mb-8">
        <Apple className="w-8 h-8 text-red-400 absolute top-0 left-8 animate-fly-in" style={{animationDelay: '0s'}} />
        <Carrot className="w-8 h-8 text-orange-400 absolute top-8 left-0 animate-fly-in" style={{animationDelay: '0.2s'}} />
        <Milk className="w-8 h-8 text-blue-300 absolute top-2 left-20 animate-fly-in" style={{animationDelay: '0.4s'}} />
        <Star className="w-6 h-6 text-yellow-300 absolute -top-4 right-8 animate-fly-in" style={{animationDelay: '0.6s'}} />
        
        <ShoppingCart className="w-32 h-32 text-primary absolute bottom-0 right-0 animate-cart-slide" />
      </div>

      <div className="font-headline text-4xl md:text-5xl tracking-wider animate-title-fade">
            Ramu Kaka Market
      </div>
       <p className="mt-4 text-lg text-primary/70 animate-fade-in" style={{ animationDelay: '2.5s' }}>
        Loading a personalized experience...
      </p>
    </div>
  );
}
