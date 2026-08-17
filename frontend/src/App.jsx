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
import DoctorPortal from './components/DoctorPortal/DoctorPortal';
import ProfileSettings from './components/ProfileSettings/ProfileSettings';
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
          if (!resetFlow.current) setView(data.role === 'doctor' ? 'doctor' : 'portal');
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

  const isDoctor = user?.role === 'doctor';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            🛡️
          </div>
          <div>
            <h1>MedVault</h1>
            <p>AI-powered secure patient data access auditor</p>
          </div>
        </div>
        {user && isDoctor ? (
          <nav
            id="primary-nav"
            aria-label="Primary"
            className={`app-nav nav-menu ${menuOpen ? 'open' : ''}`}
          >
            <span className="user-pill">
              {user.name}
              {user.specialty ? ` · ${user.specialty}` : ''}
            </span>
            <span className="brand-badge">Provider portal</span>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        ) : user ? (
          <nav
            id="primary-nav"
            aria-label="Primary"
            className={`app-nav nav-menu ${menuOpen ? 'open' : ''}`}
          >
            <span className="user-pill">
              {user.avatar && <img className="user-pill-avatar" src={user.avatar} alt="" />}
              Hi, {user.name}
            </span>
            <button
              type="button"
              onClick={() => go('portal')}
              aria-current={view === 'portal' ? 'page' : undefined}
            >
              My Records
            </button>
            <button
              type="button"
              onClick={() => go('dashboard')}
              aria-current={view === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => go('assistant')}
              aria-current={view === 'assistant' ? 'page' : undefined}
            >
              Assistant
            </button>
            <button
              type="button"
              onClick={() => go('settings')}
              aria-current={view === 'settings' ? 'page' : undefined}
            >
              Settings
            </button>
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

      <main id="main-content" tabIndex={-1}>
        {view === 'login' && (
          <div className="auth-shell">
            <div className="hero-panel">
              <p className="eyebrow">Security meets empathy</p>
              <h2>See who touched your medical records and why.</h2>
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
                setView(u.role === 'doctor' ? 'doctor' : 'portal');
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
              <h2>Locked out? Reset your password.</h2>
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
              <h2>Choose a new password.</h2>
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
              <h2>Take control of your medical record transparency.</h2>
              <p>Register once and start monitoring every access event around your care.</p>
            </div>
            <RegisterForm
              onRegister={(u) => {
                setUser(u);
                setView(u.role === 'doctor' ? 'doctor' : 'portal');
              }}
              onNav={() => setView('login')}
            />
          </div>
        )}
        {view === 'portal' && user && (
          <div className="portal-view">
            <div className="hero-panel portal-hero">
              <p className="eyebrow">Protected portal</p>
              <h2>Monitor your health history with transparency.</h2>
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
          <ProfileSettings user={user} onUpdated={setUser} onBack={() => setView('portal')} />
        )}
        {view === 'doctor' && user && isDoctor && <DoctorPortal />}
      </main>
    </div>
  );
}
