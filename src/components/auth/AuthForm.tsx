'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Field } from '@/components/auth/Field';
import { useJsonForm } from '@/lib/use-json-form';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
    const router = useRouter();
    const params = useSearchParams();
    const next = params.get('next');
    const redirectTo = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
    const { errors, busy, submit } = useJsonForm();

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.currentTarget));
        const ok = await submit(`/api/auth/${mode}`, body);
        if (ok) {
            router.push(redirectTo);
            router.refresh();
        }
    }

    const isSignup = mode === 'signup';
    const other = isSignup ? '/login' : '/signup';
    const otherHref = next ? `${other}?next=${encodeURIComponent(next)}` : other;

    return (
        <div className="card p-6 sm:p-8">
            <h1 className="text-2xl font-bold">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mt-1 text-sm text-lime/60">
                {isSignup
                    ? 'An account lets you share playlists on the forum.'
                    : 'Log in to share playlists on the forum.'}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                {isSignup && (
                    <Field label="Username" name="username" autoComplete="username" required error={errors.username} />
                )}
                <Field
                    label="Email address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    error={errors.email}
                />
                <Field
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    error={errors.password}
                />
                {isSignup && (
                    <Field
                        label="Confirm password"
                        name="passwordConfirm"
                        type="password"
                        autoComplete="new-password"
                        required
                        error={errors.passwordConfirm}
                    />
                )}
                {errors.form && !Object.keys(errors).some((k) => k !== 'form') && (
                    <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                        {errors.form}
                    </p>
                )}
                <button className="btn-primary w-full" disabled={busy}>
                    {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
                </button>
            </form>
            <p className="mt-6 text-center text-sm text-lime/60">
                {isSignup ? 'Already have an account? ' : 'New to Norabox? '}
                <Link href={otherHref} className="font-semibold text-moss hover:underline">
                    {isSignup ? 'Log in' : 'Sign up'}
                </Link>
            </p>
        </div>
    );
}
