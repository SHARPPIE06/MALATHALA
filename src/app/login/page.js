import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Login - MALATHALA Visual Artist Portal',
  description: 'Sign in to manage your visual arts portfolio on MALATHALA.'
};

export default function LoginPage() {
  return (
    <div className="container auth-wrapper fade-in">
      <LoginForm />
    </div>
  );
}
