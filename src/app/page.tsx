'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function Home() {
  const { user, login } = useAuth();

  return (
    <div className="space-y-12 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Equipment Management
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Streamline your equipment checkout, tracking, and maintenance workflow.
        </p>
      </div>

      {!user ? (
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center space-y-6">
            <h2 className="text-2xl font-semibold">Get Started</h2>
            <p className="text-muted-foreground">Select a role to simulate login:</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => login('u1')} variant="outline" className="w-full justify-start px-4">
                <span className="font-bold mr-2">Staff:</span> Alice (Checkout & Returns)
              </Button>
              <Button onClick={() => login('u2')} variant="outline" className="w-full justify-start px-4">
                <span className="font-bold mr-2">Manager:</span> Bob (Full Access)
              </Button>
              <Button onClick={() => login('u3')} variant="outline" className="w-full justify-start px-4">
                <span className="font-bold mr-2">Viewer:</span> Charlie (Read Only)
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Link href="/inventory" className="group">
            <Card className="h-full p-6 hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Inventory</h3>
              <p className="text-muted-foreground">Browse equipment, check availability, and view details.</p>
            </Card>
          </Link>

          {user.role === 'STAFF' && (
            <>
              <Link href="/checkout" className="group">
                <Card className="h-full p-6 hover:border-primary transition-colors">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Checkout</h3>
                  <p className="text-muted-foreground">Scan items and assign them to projects.</p>
                </Card>
              </Link>

              <Link href="/returns" className="group">
                <Card className="h-full p-6 hover:border-primary transition-colors">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Returns</h3>
                  <p className="text-muted-foreground">Return equipment and report conditions.</p>
                </Card>
              </Link>
            </>
          )}

          {user.role === 'MANAGER' && (
            <>
              <Link href="/verification" className="group">
                <Card className="h-full p-6 hover:border-primary transition-colors">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Verification</h3>
                  <p className="text-muted-foreground">Verify returned items and manage damage reports.</p>
                </Card>
              </Link>

              <Link href="/dashboard" className="group">
                <Card className="h-full p-6 hover:border-primary transition-colors">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Dashboard</h3>
                  <p className="text-muted-foreground">View system statistics and recent activity.</p>
                </Card>
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
