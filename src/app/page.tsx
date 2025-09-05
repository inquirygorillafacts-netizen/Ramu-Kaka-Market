
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '@/components/SplashScreen';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleAnimationComplete = () => {
    // Here you would check for user's auth status
    const isLoggedIn = false; // Replace with actual check

    if (isLoggedIn) {
      // For now, let's assume they have a default role and go to customer page
      router.push('/customer');
    } else {
      router.push('/auth');
    }
  };

  if (loading) {
    return <SplashScreen onAnimationComplete={() => setLoading(false)} />;
  }
  
  // After splash, immediately redirect
  handleAnimationComplete();
  
  // Render nothing, or a fallback loader
  return null;
}
