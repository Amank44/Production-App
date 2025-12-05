import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key for admin actions
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
            throw new Error('Server configuration error');
        }

        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error fetching users:', error);
            throw error;
        }

        return NextResponse.json(users);
    } catch (error: any) {
        console.error('API Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
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
