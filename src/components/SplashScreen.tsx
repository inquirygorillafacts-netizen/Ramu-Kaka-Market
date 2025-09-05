import { Apple, Carrot, Milk, Bot, Wheat, Lollipop } from 'lucide-react';

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
       <p className="mt-8 text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '2.5s' }}>
        Loading a personalized experience...
      </p>
    </div>
  );
}
