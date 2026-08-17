import React, { useState } from 'react';
import PropTypes from 'prop-types';
import API_BASE from '../../apiBase';
import './ProfileSettings.css';

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_AVATAR_BYTES = 1_000_000;

export default function ProfileSettings({ user, onUpdated, onBack }) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatar, setAvatar] = useState(null); // newly selected (data URL)
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [offHoursStart, setOffHoursStart] = useState(user.preferences?.offHoursStart ?? 23);
  const [offHoursEnd, setOffHoursEnd] = useState(user.preferences?.offHoursEnd ?? 5);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Change-password sub-form.
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState('');
  const [pwError, setPwError] = useState('');

  const currentAvatar = removeAvatar ? null : avatar || user.avatar || null;
  const initials = (user.name || '?').trim().charAt(0).toUpperCase();

  const handleAvatarChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      setError('Profile photo must be a PNG, JPG, or WEBP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Profile photo must be 1 MB or smaller.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(reader.result);
      setRemoveAvatar(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('Saving…');
    const payload = { name, phone, offHoursStart, offHoursEnd };
    if (avatar) payload.avatar = avatar;
    else if (removeAvatar) payload.removeAvatar = true;
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
      setAvatar(null);
      setRemoveAvatar(false);
      setStatus('Saved!');
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus('');
      setError(data.error || 'Could not save. Please try again.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError('The new passwords do not match.');
      return;
    }
    setPwStatus('Updating…');
    const res = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwStatus('Password updated.');
    } else {
      const data = await res.json().catch(() => ({}));
      setPwStatus('');
      setPwError(data.error || 'Could not update your password.');
    }
  };

  return (
    <div className="settings-shell">
      <div className="settings-card">
        <p className="eyebrow">Profile & Settings</p>
        <h2>Manage your account</h2>
        <p className="settings-subtitle">
          Update your profile details and photo, change your password, and tune the off-hours window
          used by the anomaly rules.
        </p>

        <form onSubmit={handleSaveProfile}>
          <div className="avatar-row">
            <div className="avatar-preview" aria-hidden="true">
              {currentAvatar ? <img src={currentAvatar} alt="" /> : <span>{initials}</span>}
            </div>
            <div className="avatar-controls">
              <label className="avatar-upload-label" htmlFor="settings-avatar">
                Profile photo
              </label>
              <input
                id="settings-avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                aria-describedby="avatar-hint"
              />
              <p id="avatar-hint" className="settings-hint">
                PNG, JPG, or WEBP, up to 1 MB.
              </p>
              {currentAvatar && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setAvatar(null);
                    setRemoveAvatar(true);
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          <div className="settings-grid">
            <label htmlFor="settings-name">
              <span>Full name</span>
              <input
                id="settings-name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label htmlFor="settings-email">
              <span>Email</span>
              <input
                id="settings-email"
                name="email"
                autoComplete="email"
                value={user.email || ''}
                disabled
                readOnly
              />
            </label>
            <label htmlFor="settings-phone">
              <span>Phone number</span>
              <input
                id="settings-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g., (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <div />
            <label htmlFor="settings-offhours-start">
              <span>Off-hours start</span>
              <input
                id="settings-offhours-start"
                type="number"
                min="0"
                max="23"
                aria-describedby="offhours-hint"
                value={offHoursStart}
                onChange={(e) => setOffHoursStart(Number(e.target.value))}
              />
            </label>
            <label htmlFor="settings-offhours-end">
              <span>Off-hours end</span>
              <input
                id="settings-offhours-end"
                type="number"
                min="0"
                max="23"
                aria-describedby="offhours-hint"
                value={offHoursEnd}
                onChange={(e) => setOffHoursEnd(Number(e.target.value))}
              />
            </label>
            <p id="offhours-hint" className="settings-hint">
              Use a 24-hour clock (0–23). Access during this window is treated as off-hours.
            </p>
          </div>

          {error && (
            <p className="settings-error" role="alert">
              {error}
            </p>
          )}
          <div className="settings-actions">
            <span className="settings-status" role="status" aria-live="polite">
              {status}
            </span>
            <button type="button" className="secondary-btn" onClick={onBack}>
              Back to records
            </button>
            <button type="submit" className="primary-btn">
              Save changes
            </button>
          </div>
        </form>

        <hr className="settings-divider" />

        <form onSubmit={handleChangePassword} className="password-form">
          <h3>Change password</h3>
          <div className="settings-grid">
            <label htmlFor="current-password">
              <span>Current password</span>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </label>
            <div />
            <label htmlFor="new-password">
              <span>New password</span>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </label>
            <label htmlFor="confirm-password">
              <span>Confirm new password</span>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </label>
          </div>
          {pwError && (
            <p className="settings-error" role="alert">
              {pwError}
            </p>
          )}
          <div className="settings-actions">
            <span className="settings-status" role="status" aria-live="polite">
              {pwStatus}
            </span>
            <button type="submit" className="primary-btn">
              Update password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ProfileSettings.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    avatar: PropTypes.string,
    preferences: PropTypes.object,
  }).isRequired,
  onUpdated: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};
