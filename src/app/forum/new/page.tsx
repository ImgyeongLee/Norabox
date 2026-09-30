import { redirect } from 'next/navigation';

/** Old address: sharing on the forum now means creating a public playlist. */
export default function LegacyNewPostPage() {
    redirect('/playlists/new?visibility=public');
}
