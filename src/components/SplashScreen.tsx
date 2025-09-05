import { Apple, Carrot, Milk, Wheat, Lollipop, BadgePercent, Gift, Star } from 'lucide-react';

export default function SplashScreen({ onAnimationComplete }: { onAnimationComplete: () => void }) {
  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground overflow-hidden font-sans"
    >
      <div className="relative flex flex-col items-center text-center p-4">
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
                <BadgePercent className="w-6 h-6 text-primary" />
                <span className="font-semibold text-foreground">Best Deals</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
                <Gift className="w-6 h-6 text-accent" />
                <span className="font-semibold text-foreground">Exciting Rewards</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
                <Star className="w-6 h-6 text-yellow-500" />
                <span className="font-semibold text-foreground">Quality Products</span>
            </div>
        </div>
        <h1 className="font-headline text-5xl md:text-6xl text-primary animate-fade-in-down" style={{ animationDelay: '0.8s' }}>
          Ramu Kaka Market
        </h1>
        <div className="mt-4 w-4/5 h-0.5 bg-border animate-draw-line mx-auto" style={{ animationDelay: '1.3s' }} />
        
        <div className="mt-8 flex items-end space-x-6 h-16">
            <Apple className="w-10 h-10 text-red-500 animate-place-item-bounce" style={{ animationDelay: '1.8s' }} />
            <Carrot className="w-12 h-12 text-orange-500 animate-place-item-bounce" style={{ animationDelay: '2.0s' }} />
            <Milk className="w-10 h-10 text-blue-400 animate-place-item-bounce" style={{ animationDelay: '2.2s' }} />
            <Wheat className="w-12 h-12 text-yellow-500 animate-place-item-bounce" style={{ animationDelay: '2.4s' }} />
            <Lollipop onAnimationEnd={onAnimationComplete} className="w-10 h-10 text-pink-500 animate-place-item-bounce" style={{ animationDelay: '2.6s' }} />
        </div>
      </div>
    </div>
  );
}
