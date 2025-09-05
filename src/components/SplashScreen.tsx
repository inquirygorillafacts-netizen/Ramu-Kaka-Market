import { Apple, Carrot, Milk, Wheat, Lollipop, BadgePercent, Gift, Star } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground overflow-hidden font-sans">
      <div className="relative flex flex-col items-center">
        <h1 className="font-headline text-5xl md:text-6xl text-primary animate-fade-in-down">
          Ramu Kaka Market
        </h1>
        <div className="mt-4 w-4/5 h-0.5 bg-border animate-draw-line" style={{ animationDelay: '0.5s' }} />
        
        <div className="mt-8 flex items-end space-x-6 h-16">
            <Apple className="w-10 h-10 text-red-500 animate-place-item-bounce" style={{ animationDelay: '1s' }} />
            <Carrot className="w-12 h-12 text-orange-500 animate-place-item-bounce" style={{ animationDelay: '1.2s' }} />
            <Milk className="w-10 h-10 text-blue-400 animate-place-item-bounce" style={{ animationDelay: '1.4s' }} />
            <Wheat className="w-12 h-12 text-yellow-500 animate-place-item-bounce" style={{ animationDelay: '1.6s' }} />
            <Lollipop className="w-10 h-10 text-pink-500 animate-place-item-bounce" style={{ animationDelay: '1.8s' }} />
        </div>
      </div>
      <div className="mt-12 flex flex-col md:flex-row gap-4 items-center justify-center">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm animate-fade-in-up" style={{ animationDelay: '2.2s' }}>
            <BadgePercent className="w-6 h-6 text-primary" />
            <span className="font-semibold text-foreground">Best Deals</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm animate-fade-in-up" style={{ animationDelay: '2.4s' }}>
            <Gift className="w-6 h-6 text-accent" />
            <span className="font-semibold text-foreground">Exciting Rewards</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm animate-fade-in-up" style={{ animationDelay: '2.6s' }}>
            <Star className="w-6 h-6 text-yellow-500" />
            <span className="font-semibold text-foreground">Quality Products</span>
        </div>
      </div>
    </div>
  );
}
