import React, { useState, useEffect, useRef } from 'react';
import LoginForm from './components/LoginForm/LoginForm';
import RegisterForm from './components/RegisterForm/RegisterForm';
import ForgotPasswordForm from './components/ForgotPasswordForm/ForgotPasswordForm';
import ResetPasswordForm from './components/ResetPasswordForm/ResetPasswordForm';
import RecordList from './components/RecordList/RecordList';
import SearchBar from './components/SearchBar/SearchBar';
import Pagination from './components/Pagination/Pagination';
import AccessTimeline from './components/AccessTimeline/AccessTimeline';
import RiskDashboard from './components/RiskDashboard/RiskDashboard';
import AssistantChat from './components/AssistantChat/AssistantChat';
import './App.css';
import API_BASE from './apiBase';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem('medvault-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [resetToken, setResetToken] = useState('');
  const [records, setRecords] = useState([]);
  const [recordQuery, setRecordQuery] = useState('');
  const [recordPage, setRecordPage] = useState(1);
  const [recordMeta, setRecordMeta] = useState({ total: 0, totalPages: 1 });
  const [activeRecord, setActiveRecord] = useState(null);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    offHoursStart: 23,
    offHoursEnd: 5,
  });

  const resetFlow = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('medvault-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // A password-reset link opens the app with ?token=...; show the reset screen.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      resetFlow.current = true;
      setResetToken(token);
      setView('reset');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
          if (!resetFlow.current) setView('portal');
        }
      });
  }, []);

  const RECORDS_PER_PAGE = 20;

  const loadRecords = async (page, q) => {
    const params = new URLSearchParams({ page: String(page), limit: String(RECORDS_PER_PAGE) });
    if (q.trim()) params.set('q', q.trim());
    const res = await fetch(`${API_BASE}/api/records?${params.toString()}`, {
      credentials: 'include',
    });
    const data = await res.json();
    setRecords(data.records || []);
    setRecordMeta({ total: data.total || 0, totalPages: data.totalPages || 1 });
  };

  const handlePageChange = (nextPage) => {
    setRecordPage(nextPage);
    loadRecords(nextPage, recordQuery);
  };

  // Load records on entering the portal and whenever the search term changes (debounced).
  useEffect(() => {
    if (!(user && view === 'portal')) return undefined;
    const timer = setTimeout(() => {
      setRecordPage(1);
      loadRecords(1, recordQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [user, view, recordQuery]);

  useEffect(() => {
    if (user && view === 'dashboard')
      fetch(`${API_BASE}/api/risk-dashboard`, { credentials: 'include' })
        .then((r) => r.json())
        .then(setDashboardData);
  }, [user, view]);

  useEffect(() => {
    if (user) {
      setSettings({
        name: user.name || '',
        email: user.email || '',
        offHoursStart: 23,
        offHoursEnd: 5,
      });
    }
  }, [user]);

  const fetchTimeline = async (record) => {
    setActiveRecord(record);
    await fetch(`${API_BASE}/api/records/${record._id}`, {
      credentials: 'include',
      headers: {
        'x-simulated-accessor': 'Dr. Evans',
        'x-simulated-role': 'Endocrinologist',
      },
    });
    const res = await fetch(`${API_BASE}/api/access-logs?recordId=${record._id}`, {
      credentials: 'include',
    });
    const data = await res.json();
    setTimelineLogs(Array.isArray(data) ? data : []);
  };

  const [settingsStatus, setSettingsStatus] = useState('');

  const handleSaveSettings = async () => {
    setSettingsStatus('Saving…');
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settings.name,
        offHoursStart: settings.offHoursStart,
        offHoursEnd: settings.offHoursEnd,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setUser(updated);
      setSettingsStatus('Saved!');
    } else {
      setSettingsStatus('Save failed. Please try again.');
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);

  const go = (nextView) => {
    setView(nextView);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }).then(() => {
      setUser(null);
      setView('login');
    });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">🛡️</div>
          <div>
            <h2>MedVault</h2>
            <p>AI-powered secure patient data access auditor</p>
          </div>
        </div>
        {user ? (
          <nav id="primary-nav" className={`app-nav nav-menu ${menuOpen ? 'open' : ''}`}>
            <button type="button" onClick={() => go('portal')}>
              My Records
            </button>
            <button type="button" onClick={() => go('dashboard')}>
              Dashboard
            </button>
            <button type="button" onClick={() => go('assistant')}>
              Assistant
            </button>
            <button type="button" onClick={() => go('settings')}>
              Settings
            </button>
            <span className="user-pill">Hi, {user.name}</span>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        ) : (
          <div className="app-nav">
            <span className="brand-badge">Privacy-first healthcare access</span>
          </div>
        )}
        <div className="header-controls">
          <button
            type="button"
            className="theme-toggle"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user && (
            <button
              type="button"
              className="hamburger"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              aria-controls="primary-nav"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          )}
        </div>
      </header>

      <main>
        {view === 'login' && (
          <div className="auth-shell">
            <div className="hero-panel">
              <p className="eyebrow">Security meets empathy</p>
              <h3>See who touched your medical records and why.</h3>
              <p>MedVault turns access logs into a clear, patient-friendly audit experience.</p>
              <ul>
                <li>Track every record interaction</li>
                <li>Flag unusual access patterns</li>
                <li>Understand alerts in plain English</li>
              </ul>
            </div>
            <LoginForm
              onLogin={(u) => {
                setUser(u);
                setView('portal');
              }}
              onNav={() => setView('register')}
              onForgot={() => setView('forgot')}
            />
          </div>
        )}
        {view === 'forgot' && (
          <div className="auth-shell">
            <div className="hero-panel">
              <p className="eyebrow">Account recovery</p>
              <h3>Locked out? Reset your password.</h3>
              <p>We&apos;ll generate a secure, time-limited link so you can set a new password.</p>
            </div>
            <ForgotPasswordForm
              onBack={() => setView('login')}
              onProceed={(token) => {
                setResetToken(token);
                setView('reset');
              }}
            />
          </div>
        )}
        {view === 'reset' && (
          <div className="auth-shell">
            <div className="hero-panel">
              <p className="eyebrow">Account recovery</p>
              <h3>Choose a new password.</h3>
              <p>Set a new password to regain access to your records.</p>
            </div>
            <ResetPasswordForm
              token={resetToken}
              onDone={() => {
                setResetToken('');
                setView('login');
              }}
              onBack={() => setView('login')}
            />
          </div>
        )}
        {view === 'register' && (
          <div className="auth-shell">
            <div className="hero-panel">
              <p className="eyebrow">Create your secure account</p>
              <h3>Take control of your medical record transparency.</h3>
              <p>Register once and start monitoring every access event around your care.</p>
            </div>
            <RegisterForm
              onRegister={(u) => {
                setUser(u);
                setView('portal');
              }}
              onNav={() => setView('login')}
            />
          </div>
        )}
        {view === 'portal' && user && (
          <div className="portal-view">
            <div className="hero-panel portal-hero">
              <p className="eyebrow">Protected portal</p>
              <h3>Monitor your health history with transparency.</h3>
              <p>
                Review records, inspect access events, and keep suspicious activity visible in plain
                language.
              </p>
            </div>
            <div className="portal-grid">
              <div className="records-column">
                <SearchBar
                  value={recordQuery}
                  onChange={setRecordQuery}
                  placeholder="Search by title, type, or notes"
                />
                <RecordList
                  records={records}
                  onSelect={fetchTimeline}
                  activeId={activeRecord?._id}
                  onRefresh={() => loadRecords(recordPage, recordQuery)}
                  isSearching={recordQuery.trim().length > 0}
                />
                <Pagination
                  page={recordPage}
                  totalPages={recordMeta.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
              <AccessTimeline logs={timelineLogs} title={activeRecord?.title} />
            </div>
          </div>
        )}
        {view === 'dashboard' && user && dashboardData && (
          <div className="dashboard-view">
            <RiskDashboard data={dashboardData} theme={theme} />
          </div>
        )}
        {view === 'assistant' && user && (
          <div className="assistant-view">
            <AssistantChat
              suggestions={[
                'Who accessed my records most recently?',
                'Were any of my records accessed outside normal hours?',
                'How many access events have been flagged?',
              ]}
            />
          </div>
        )}
        {view === 'settings' && user && (
          <div className="settings-shell">
            <div className="settings-card">
              <p className="eyebrow">Profile & Settings</p>
              <h3>Manage your account preferences</h3>
              <p className="settings-subtitle">
                Keep your profile details up to date and tune the off-hours window used by the
                anomaly rules.
              </p>

              <div className="settings-grid">
                <label>
                  <span>Full name</span>
                  <input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input value={settings.email} disabled readOnly />
                </label>
                <label>
                  <span>Off-hours start</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.offHoursStart}
                    onChange={(e) =>
                      setSettings({ ...settings, offHoursStart: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>Off-hours end</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={settings.offHoursEnd}
                    onChange={(e) =>
                      setSettings({ ...settings, offHoursEnd: Number(e.target.value) })
                    }
                  />
                </label>
              </div>

              <div className="settings-actions">
                {settingsStatus && <span className="settings-status">{settingsStatus}</span>}
                <button type="button" className="secondary-btn" onClick={() => setView('portal')}>
                  Back to records
                </button>
                <button type="button" className="primary-btn" onClick={handleSaveSettings}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
