import { Package } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-primary">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-48 h-48 bg-primary/10 rounded-full animate-ping" />
        <div className="absolute w-32 h-32 bg-primary/20 rounded-full animate-ping animation-delay-200" />
        <Package className="w-24 h-24 text-primary animate-pulse" />
      </div>
      <h1 className="mt-8 text-4xl md:text-6xl font-headline animate-fade-in-up">
        Ramu Kaka Market
      </h1>
    </div>
  );
}
