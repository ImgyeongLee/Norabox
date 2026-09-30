import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/i18n/server';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Logo } from '@/components/Logo';
import { UserMenu } from '@/components/UserMenu';

export async function Header() {
    const [user, { t }] = await Promise.all([getCurrentUser(), getI18n()]);
    return (
        <header className="sticky top-0 z-40 border-b border-leaf/30 bg-pine/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3">
                <Logo />
                <nav className="flex items-center gap-1 sm:ml-6">
                    <Link href="/forum" className="btn-ghost px-3 py-2">
                        {t.nav.forum}
                    </Link>
                    {user && (
                        // On phones this lives in the user menu to save space.
                        <Link href="/playlists" className="btn-ghost hidden px-3 py-2 sm:inline-flex">
                            {t.nav.myPlaylists}
                        </Link>
                    )}
                </nav>
                <div className="ml-auto flex items-center gap-2">
                    <LanguageSwitcher />
                    {user ? (
                        <UserMenu username={user.username} avatarUrl={user.avatarUrl} />
                    ) : (
                        <>
                            <Link href="/login" className="btn-ghost hidden px-3 py-2 sm:inline-flex">
                                {t.nav.login}
                            </Link>
                            <Link href="/signup" className="btn-primary px-3 py-2">
                                {t.nav.signup}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
