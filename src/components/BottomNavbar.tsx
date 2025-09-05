
'use client';

import { Home, Heart, ShoppingBasket, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/customer', label: 'Home', icon: Home },
  { href: '/customer/favorites', label: 'Favorites', icon: Heart },
  { href: '/customer/cart', label: 'Tokri', icon: ShoppingBasket },
  { href: '/customer/orders', label: 'Orders', icon: Package },
  { href: '/customer/profile', label: 'Profile', icon: User },
];

export default function BottomNavbar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-card border-t border-border shadow-t">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
