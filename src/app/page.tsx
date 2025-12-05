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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 sm:py-24 text-center">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent animate-fade-in">
              Vpub App
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground animate-slide-in-from-bottom">
              Streamline your equipment checkout, tracking, and maintenance workflow.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6 animate-slide-in-from-bottom" style={{ animationDelay: '0.1s' }}>
              <Link href="/login">
                <Button size="lg" className="px-8">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
