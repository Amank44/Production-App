'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';

export default function LoginPage() {
    const router = useRouter();
    const { login, signUp, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    React.useEffect(() => {
        if (user) {
            if (user.role === 'MANAGER' || user.role === 'ADMIN') {
                router.push('/dashboard');
            } else {
                router.push('/inventory');
            }
        }
    }, [user, router]);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'CREW' // Default role
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await login(formData.email, formData.password);
                if (error) throw error;
                router.push('/');
            } else {
                const { error } = await signUp(
                    formData.email,
                    formData.password,
                    formData.name,
                    formData.role
                );
                if (error) throw error;
                // On successful signup, maybe auto-login or show message?
                // Supabase usually logs in automatically after signup unless email confirmation is on.
                // We'll assume it works and redirect.
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-br from-background to-secondary/20">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-violet-600 bg-clip-text text-transparent">
                        Vpub App
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>

                <Card className="p-6" variant="glass">
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {!isLogin && (
                            <>
                                <Input
                                    label="Full Name"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Role
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="CREW">Crew</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <Input
                            label="Email address"
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />

                        <Input
                            label="Password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            isLoading={isLoading}
                        >
                            {isLogin ? 'Sign in' : 'Create account'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-primary hover:underline"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
