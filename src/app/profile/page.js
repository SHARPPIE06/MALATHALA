import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Artist Profile - MALATHALA Visual Artist Portal',
  description: 'Manage your visual arts showcase, upload creations, and edit your bio.'
};

export default function ProfilePage() {
  return <ProfileClient />;
}
