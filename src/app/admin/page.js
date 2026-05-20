import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Dashboard - MALATHALA Visual Artist Portal',
  description: 'Manage user accounts, review applications, and view platform statistics.'
};

export default function AdminPage() {
  return <AdminClient />;
}
