import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ForgotPasswordForm.css';
import API_BASE from '../../apiBase';

export default function ForgotPasswordForm({ onBack, onProceed }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [devToken, setDevToken] = useState(null);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus('Sending…');
    setDevToken(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus(data.message || data.error || 'Done.');
      if (data.devToken) setDevToken(data.devToken);
    } catch {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="eyebrow">Account recovery</p>
        <h3>Forgot your password?</h3>
        <p className="auth-subtitle">
          Enter your account email and we&apos;ll generate a secure reset link.
        </p>
      </div>
      <form onSubmit={submit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <button type="submit" disabled={sending}>
          Send reset link
        </button>
      </form>
      {status && <p className="auth-note">{status}</p>}
      {devToken && (
        <div className="dev-reset">
          <p className="auth-note">
            Development mode: the link would normally be emailed. Continue to reset now.
          </p>
          <button type="button" onClick={() => onProceed(devToken)}>
            Continue to reset
          </button>
        </div>
      )}
      <button type="button" onClick={onBack} className="secondary-link">
        Back to sign in
      </button>
    </div>
  );
}

ForgotPasswordForm.propTypes = {
  onBack: PropTypes.func.isRequired,
  onProceed: PropTypes.func.isRequired,
};
