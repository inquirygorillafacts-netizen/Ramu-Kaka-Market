
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
          // User is logged in, send to role selection
          router.push('/role-selection');
        } else {
          // User is not logged in, send to auth page
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
