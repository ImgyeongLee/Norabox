import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { UserMenu } from '@/components/UserMenu';

export async function Header() {
    const user = await getCurrentUser();
    return (
        <header className="sticky top-0 z-40 border-b border-leaf/30 bg-pine/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
                <Logo />
                <nav className="ml-2 flex items-center gap-1 sm:ml-6">
                    <Link href="/forum" className="btn-ghost px-3 py-2">
                        Forum
                    </Link>
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    {user ? (
                        <UserMenu username={user.username} avatarUrl={user.avatarUrl} />
                    ) : (
                        <>
                            <Link href="/login" className="btn-ghost px-3 py-2">
                                Log in
                            </Link>
                            <Link href="/signup" className="btn-primary px-3 py-2">
                                Sign up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
