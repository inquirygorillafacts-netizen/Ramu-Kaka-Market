import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        highlight: ['Playfair Display', 'serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fly-in-item': {
            '0%': { transform: 'translateY(-100px) translateX(-50px) rotate(-90deg) scale(0.5)', opacity: '0' },
            '60%': { transform: 'translateY(80px) translateX(80px) rotate(0deg) scale(1)', opacity: '1' },
            '100%': { transform: 'translateY(80px) translateX(80px) scale(0)', opacity: '0' },
        },
        'cart-bounce': {
            '0%, 50%, 100%': { transform: 'scale(1)' },
            '60%, 80%': { transform: 'scale(1.1) rotate(-5deg)'},
            '70%, 90%': { transform: 'scale(0.9) rotate(5deg)'},
        },
        'neon-glow': {
            '0%, 100%': { 'box-shadow': '0 0 5px hsl(var(--primary)), 0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))' },
            '50%': { 'box-shadow': '0 0 10px hsl(var(--accent)), 0 0 20px hsl(var(--accent)), 0 0 40px hsl(var(--accent))' },
        },
        'typing': {
            'from': { width: '0' },
            'to': { width: '100%' }
        },
        'text-3d': {
            '0%': { 'text-shadow': '1px 1px 0px hsl(var(--primary)), 2px 2px 0px hsl(var(--primary) / 0.5)'},
            '50%': { 'text-shadow': '2px 3px 2px hsl(var(--accent)), 4px 5px 2px hsl(var(--accent) / 0.5)'},
            '100%': { 'text-shadow': '1px 1px 0px hsl(var(--primary)), 2px 2px 0px hsl(var(--primary) / 0.5)'},
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 1s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fly-in-item': 'fly-in-item 1.5s ease-in-out forwards',
        'cart-bounce': 'cart-bounce 1.8s ease-out 0.5s',
        'neon-glow': 'neon-glow 2.5s linear infinite',
        'typing': 'typing 2s steps(40, end) 0.5s 1 normal both, fade-in 1s forwards',
        'text-3d': 'text-3d 3s ease-in-out infinite'
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
