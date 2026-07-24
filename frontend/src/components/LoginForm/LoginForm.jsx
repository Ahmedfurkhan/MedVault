import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './LoginForm.css';
import API_BASE from '../../apiBase';

export default function LoginForm({ onLogin, onNav, onForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else onLogin(data);
  };

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="eyebrow">Secure sign-in</p>
        <h3>Welcome back</h3>
        <p className="auth-subtitle">Access your records and review your audit trail.</p>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={submit}>
        {/* REVIEW: relies on placeholder text instead of an associated <label>, so
            screen readers lose the field name once the user starts typing. Same
            pattern repeats in RegisterForm and ForgotPasswordForm. */}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Login</button>
      </form>
      <button type="button" onClick={onForgot} className="forgot-link">
        Forgot password?
      </button>
      <button type="button" onClick={onNav} className="secondary-link">
        Create account
      </button>
    </div>
  );
}
LoginForm.propTypes = {
  onLogin: PropTypes.func.isRequired,
  onNav: PropTypes.func.isRequired,
  onForgot: PropTypes.func.isRequired,
};
