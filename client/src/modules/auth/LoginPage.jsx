/**
 * Sign-in screen: brand panel on the left (stacks on top on mobile), form on the right.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, User } from 'lucide-react';
import { Alert, Button, Input, Logo } from '../../components/ui-kit';
import { getHomePath } from '../../config/roles';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import './LoginPage.css';

function validate({ username, password }) {
  const errors = {};
  if (!username.trim()) errors.username = 'Enter your username';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear the message for a field as soon as the user fixes it.
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (nextErrors.username) return usernameRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setSubmitting(true);
    setServerError('');
    try {
      const user = await login(values.username.trim(), values.password);
      navigate(getHomePath(user.role), { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <aside className="login__brand">
        <Logo size="lg" className="login__logo" />
        <div className="login__pitch">
          <h1 className="login__headline">From requirement to closed trip, in one place.</h1>
          <p className="login__tagline">
            Plan loads, compare transporter rates, follow every trip and settle payments, with AI agents doing the
            legwork and your team approving what matters.
          </p>
        </div>
        <p className="login__footnote">© {new Date().getFullYear()} Claritas Transport</p>
      </aside>

      <main className="login__panel">
        <div className="login__card">
          <header className="login__header">
            <h2 className="login__title">Sign in</h2>
            <p className="login__subtitle">Use your Claritas Transport account to continue</p>
          </header>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            {serverError && <Alert tone="danger">{serverError}</Alert>}

            <Input
              ref={usernameRef}
              label="Username"
              name="username"
              icon={User}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="admin"
              value={values.username}
              onChange={handleChange}
              error={errors.username}
              disabled={submitting}
              autoFocus
            />

            <Input
              ref={passwordRef}
              label="Password"
              name="password"
              type="password"
              icon={Lock}
              autoComplete="current-password"
              placeholder="Your password"
              value={values.password}
              onChange={handleChange}
              error={errors.password}
              disabled={submitting}
            />

            <Button type="submit" size="lg" icon={LogIn} iconPosition="right" fullWidth loading={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
