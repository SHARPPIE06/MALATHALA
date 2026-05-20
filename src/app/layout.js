import { cookies } from 'next/headers';
import { decryptSession } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata = {
  title: 'MALATHALA - Visual Artist Showcase Portal',
  description: 'A premium portfolio showcase website for visual artists at the University of Rizal System, Morong Campus.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  }
};

export default async function RootLayout({ children }) {
  let session = null;
  
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('malathala_session')?.value;
    if (token) {
      session = decryptSession(token);
      // Validate expiration
      if (session && session.expiresAt && Date.now() > session.expiresAt) {
        session = null;
      }
    }
  } catch (err) {
    console.error('Failed to get layout session:', err);
  }

  return (
    <html lang="en">
      <body>
        <Navbar session={session} />
        
        <main style={{ minHeight: 'calc(100vh - 220px)' }}>
          {children}
        </main>

        <footer className="footer">
          <div className="container">
            <p className="footer-text">
              © {new Date().getFullYear()} <span className="footer-highlight">MALATHALA</span>. All Rights Reserved.
            </p>
            <p className="footer-text" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              University of Rizal System - Morong Campus • Showcase Portal for Visual Artists
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
