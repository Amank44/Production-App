'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { storage } from '@/lib/storage';

interface AuthContextType {
    user: User | null;
    login: (userId: string) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = () => {
            const storedUserId = localStorage.getItem('active_user_id');
            if (storedUserId) {
                const users = storage.getUsers();
                const foundUser = users.find(u => u.id === storedUserId);
                if (foundUser) {
                    setUser(foundUser);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = (userId: string) => {
        const users = storage.getUsers();
        const foundUser = users.find(u => u.id === userId);
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem('active_user_id', userId);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('active_user_id');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
