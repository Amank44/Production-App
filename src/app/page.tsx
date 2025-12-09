'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user) {
      if (user.role === 'MANAGER' || user.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/inventory');
      }
    }
  }, [user, router]);

  if (user) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Hero Section */}
      <div className="relative w-full py-24 sm:py-32 lg:py-40 text-center">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 -z-10 mesh-gradient-hero opacity-60 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-4xl flex flex-col items-center">
            <div className="mb-8 flex justify-center animate-fade-in opacity-0" style={{ animationDelay: '0.1s' }}>
              <span className="rounded-full bg-white/50 backdrop-blur-md border border-white/20 px-4 py-1.5 text-sm font-medium text-foreground shadow-sm">
                New Version 2.0
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground animate-slide-up opacity-0" style={{ animationDelay: '0.2s', letterSpacing: '-0.02em', lineHeight: '1.05' }}>
              Equipment management. <br />
              <span className="text-gradient-blue">Reimagined.</span>
            </h1>

            <p className="mt-8 text-xl font-normal text-muted-foreground max-w-2xl animate-slide-up opacity-0" style={{ animationDelay: '0.4s', lineHeight: '1.5' }}>
              Effortlessly track, manage, and maintain your production inventory with a system designed for clarity, speed, and precision.
            </p>

            <div className="mt-12 flex items-center justify-center gap-x-6 animate-slide-up opacity-0" style={{ animationDelay: '0.6s' }}>
              <Link href="/login">
                <Button size="lg" className="rounded-full px-10 text-[17px] shadow-lg hover:shadow-xl transition-all duration-300 bg-[#0071e3] hover:bg-[#0077ed]">
                  Get Started
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="secondary" size="lg" className="rounded-full px-10 text-[17px] bg-white/50 backdrop-blur-sm border-white/40">
                  Learn more
                </Button>
              </Link>
            </div>

            {/* Floating Elements for Visual Interest */}
            <div className="absolute top-1/2 left-10 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
