import React, { useState, useEffect } from 'react';
import PatientList from './PatientList';
import PatientRecords from './PatientRecords';
import API_BASE from '../../apiBase';
import './DoctorPortal.css';

export default function DoctorPortal() {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  // Load / search the patient list (debounced).
  useEffect(() => {
    if (selected) return undefined;
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/doctor/patients?q=${encodeURIComponent(query.trim())}`, {
        credentials: 'include',
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setPatients(Array.isArray(data) ? data : []));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selected]);

  return (
    <div className="doctor-view">
      <div className="hero-panel doctor-hero">
        <p className="eyebrow">Provider workspace</p>
        <h2>Review your patients&apos; records</h2>
        <p>
          Open a record to view it. Every view is written to that patient&apos;s access audit, so
          your review is fully transparent to them.
        </p>
      </div>

      {selected ? (
        <PatientRecords patient={selected} onBack={() => setSelected(null)} />
      ) : (
        <PatientList patients={patients} query={query} onQuery={setQuery} onSelect={setSelected} />
      )}
    </div>
  );
}
