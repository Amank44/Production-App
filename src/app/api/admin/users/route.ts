import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Create admin client for admin operations (create user, change password, toggle status)
const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
    }
    if (!supabaseServiceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - make sure it is set in .env.local');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

export async function GET(request: Request) {
    try {
        console.log('Fetching users using shared client...');

        // Use shared supabase client instead of admin client for reading
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role, active')
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase error fetching users:', error);
            return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
        }

        console.log('Successfully fetched users, count:', users?.length || 0);
        return NextResponse.json(users || []);
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const { email, password, name, role } = body;

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) throw authError;

        if (authData.user) {
            // 2. Create user profile in public.users table
            const { error: profileError } = await supabaseAdmin
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        email,
                        name,
                        role,
                        active: true
                    }
                ]);

            if (profileError) {
                // Cleanup auth user if profile creation fails
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                throw profileError;
            }
        }

        return NextResponse.json({ message: 'User created successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const body = await request.json();
        const { id, password, active, role } = body;

        if (password) {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(id, {
                password
            });
            if (passwordError) throw passwordError;
        }

        const updates: any = {};
        if (active !== undefined) updates.active = active;
        if (role !== undefined) updates.role = role;

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;
        }

        return NextResponse.json({ message: 'User updated successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
