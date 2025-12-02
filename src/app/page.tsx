'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function Home() {
  const { user, login } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.indigo.900),theme(colors.background))] opacity-20" />
        <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-50 sm:mr-28 md:mr-0 lg:mr-0 lg:origin-center dark:bg-slate-900/5 dark:shadow-none dark:ring-0" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent animate-fade-in">
              Equipment Management
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground animate-slide-in-from-bottom">
              Streamline your equipment checkout, tracking, and maintenance workflow with our modern, intuitive platform.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-16">
        {!user ? (
          <div className="max-w-md mx-auto animate-slide-in-from-bottom" style={{ animationDelay: '0.1s' }}>
            <Card className="p-8 text-center space-y-6" variant="glass">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Welcome Back</h2>
                <p className="text-muted-foreground">Select a role to simulate login:</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={() => login('u1')} variant="outline" className="w-full justify-start px-4 h-14 hover:border-primary/50 group">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                    <span className="text-blue-600 dark:text-blue-400 font-bold">S</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Staff</div>
                    <div className="text-xs text-muted-foreground">Checkout & Returns</div>
                  </div>
                </Button>
                <Button onClick={() => login('u2')} variant="outline" className="w-full justify-start px-4 h-14 hover:border-primary/50 group">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                    <span className="text-purple-600 dark:text-purple-400 font-bold">M</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Manager</div>
                    <div className="text-xs text-muted-foreground">Full Access</div>
                  </div>
                </Button>
                <Button onClick={() => login('u3')} variant="outline" className="w-full justify-start px-4 h-14 hover:border-primary/50 group">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                    <span className="text-slate-600 dark:text-slate-400 font-bold">V</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Viewer</div>
                    <div className="text-xs text-muted-foreground">Read Only</div>
                  </div>
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto animate-fade-in">
            <Link href="/inventory" className="group">
              <Card className="h-full p-6" hover>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
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
                  <Card className="h-full p-6" hover>
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Checkout</h3>
                    <p className="text-muted-foreground">Scan items and assign them to projects.</p>
                  </Card>
                </Link>

                <Link href="/returns" className="group">
                  <Card className="h-full p-6" hover>
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
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
                  <Card className="h-full p-6" hover>
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Verification</h3>
                    <p className="text-muted-foreground">Verify returned items and manage damage reports.</p>
                  </Card>
                </Link>

                <Link href="/dashboard" className="group">
                  <Card className="h-full p-6" hover>
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
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
    </div>
  );
}
