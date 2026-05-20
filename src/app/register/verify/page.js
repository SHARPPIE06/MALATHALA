import VerificationForm from './VerificationForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Verify Email - MALATHALA Visual Artist Portal',
  description: 'Enter your 6-digit verification code to complete your registration.'
};

export default function VerifyPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: '40px 0' }}>
      <VerificationForm />
    </div>
  );
}
