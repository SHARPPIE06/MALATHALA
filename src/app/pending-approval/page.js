import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth'; // custom hook that returns current session (if you have one)

export const metadata = {
  title: 'Pending Approval - MALATHALA Visual Artist Portal',
  description: 'Your registration application is currently under review by our administrators.'
};

export default function PendingApprovalPage() {
  const router = useRouter();
  const { data: session, status } = useSession(); // assumes a hook like SWR or next-auth

  // If we already have a session and the user is approved, redirect immediately
  useEffect(() => {
    if (status === 'authenticated' && session?.status === 'approved') {
      router.replace('/'); // send user to home/dashboard
    }
  }, [status, session, router]);

  return (
    <div className="container auth-wrapper fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="auth-card glass-panel" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '64px', 
            marginBottom: '16px',
            animation: 'float 3s ease-in-out infinite',
            filter: 'drop-shadow(0 0 10px rgba(245, 176, 65, 0.4))'
          }}>
            ⏳
          </div>
          <h2 className="auth-title" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '12px' }}>
            Awaiting Admin Approval
          </h2>
          <p className="auth-subtitle" style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>
            Thank you for applying to join MALATHALA. Your artist profile is currently pending review by our administration team.
          </p>
        </div>

        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h4 style={{ color: 'white', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>What happens next?</h4>
          <ul style={{ color: 'var(--text-secondary)', fontSize: '13px', paddingLeft: '16px', margin: 0, lineHeight: '1.7' }}>
            <li>Our team will verify your registration details.</li>
            <li>You will receive an email confirmation once approved.</li>
            <li>After approval, you can log in to upload artworks.</li>
          </ul>
        </div>

        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block', width: '100%', textDecoration: 'none', textAlign: 'center' }}>
          Sign In
        </Link>
      </div>
    </div>
  );
}
