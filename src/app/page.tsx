
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '@/components/SplashScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleAnimationComplete = () => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          // In a real app, you might want to check roles here
          router.push('/customer');
        } else {
          router.push('/auth');
        }
      });
    };
    
    // This is a proxy for the animation completing
    const timer = setTimeout(() => {
        setLoading(false);
        handleAnimationComplete();
    }, 3200); // Corresponds to the longest animation duration

    return () => clearTimeout(timer);
  }, [router]);

  // The splash screen is shown based on the loading state
  // When loading is false, the redirection logic in useEffect takes over.
  return loading ? <SplashScreen onAnimationComplete={() => {}} /> : null;
}
