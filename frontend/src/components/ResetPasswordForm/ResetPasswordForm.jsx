import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './ResetPasswordForm.css';
import API_BASE from '../../apiBase';

export default function ResetPasswordForm({ token, onDone, onBack }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed.');
        return;
      }
      onDone();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="eyebrow">Account recovery</p>
        <h3>Set a new password</h3>
        <p className="auth-subtitle">Choose a new password for your account.</p>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <form onSubmit={submit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          minLength={6}
          required
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          minLength={6}
          required
        />
        <button type="submit" disabled={saving}>
          Reset password
        </button>
      </form>
      <button type="button" onClick={onBack} className="secondary-link">
        Back to sign in
      </button>
    </div>
  );
}

ResetPasswordForm.propTypes = {
  token: PropTypes.string.isRequired,
  onDone: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
