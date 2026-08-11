import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SearchBar from '../SearchBar/SearchBar';
import Pagination from '../Pagination/Pagination';
import API_BASE from '../../apiBase';

const PER_PAGE = 15;

export default function PatientRecords({ patient, onBack }) {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState('');

  const loadRecords = (nextPage, q) => {
    const params = new URLSearchParams({ page: String(nextPage), limit: String(PER_PAGE) });
    if (q.trim()) params.set('q', q.trim());
    fetch(`${API_BASE}/api/doctor/patients/${patient._id}/records?${params.toString()}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : { records: [] }))
      .then((data) => {
        setRecords(data.records || []);
        setMeta({ total: data.total || 0, totalPages: data.totalPages || 1 });
      });
  };

  // Debounced load on search; reset to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadRecords(1, query);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, patient._id]);

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    loadRecords(nextPage, query);
  };

  // Opening a record logs a real access entry to the patient's audit trail.
  const openRecord = async (rec) => {
    setStatus('Recording access…');
    const res = await fetch(`${API_BASE}/api/doctor/patients/${patient._id}/records/${rec._id}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      setActive(data);
      setStatus(`Your access to “${data.title}” was logged in ${patient.name}'s audit trail.`);
    } else {
      setStatus('Could not open that record. Please try again.');
    }
  };

  return (
    <section className="patient-panel" aria-labelledby="patient-records-heading">
      <div className="patient-records-top">
        <button type="button" className="doctor-back-btn" onClick={onBack}>
          ← All patients
        </button>
        <div>
          <h3 id="patient-records-heading">{patient.name}</h3>
          <p className="patient-records-sub">
            {patient.email} · {meta.total} record{meta.total === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <p className="doctor-status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="patient-records-grid">
        <div className="patient-records-list">
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search this patient's records"
          />
          {records.length === 0 ? (
            <p className="patient-empty">No records found.</p>
          ) : (
            <ul className="doctor-record-list" aria-label={`${patient.name}'s records`}>
              {records.map((rec) => (
                <li
                  key={rec._id}
                  className={`doctor-record-card ${active?._id === rec._id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="doctor-record-btn"
                    onClick={() => openRecord(rec)}
                    aria-current={active?._id === rec._id ? 'true' : undefined}
                    aria-label={`Open ${rec.title}`}
                  >
                    <span className="doctor-record-title">{rec.title}</span>
                    <span className="doctor-record-meta">
                      {rec.type} · {new Date(rec.date).toLocaleDateString()}
                      {rec.attachment ? ' · 📎 report' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} totalPages={meta.totalPages} onPageChange={handlePageChange} />
        </div>

        <div className="patient-record-detail" aria-live="polite">
          {active ? (
            <div className="record-detail-card">
              <h4>{active.title}</h4>
              <dl className="record-detail-fields">
                <div>
                  <dt>Type</dt>
                  <dd>{active.type}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{new Date(active.date).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt>Notes</dt>
                  <dd>{active.notes || '—'}</dd>
                </div>
              </dl>
              {active.attachment && (
                <a
                  href={`${API_BASE}/api/doctor/patients/${patient._id}/records/${active._id}/attachment`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  📎 View report ({active.attachment.fileName})
                </a>
              )}
              <p className="record-detail-note">
                Viewing this record was recorded in the patient&apos;s access audit.
              </p>
            </div>
          ) : (
            <div className="record-detail-empty">
              <div className="record-detail-empty-icon" aria-hidden="true">
                🗂️
              </div>
              <p>Select a record to view it. Opening a record logs your access for the patient.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

PatientRecords.propTypes = {
  patient: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  onBack: PropTypes.func.isRequired,
};
