import React from 'react';
import PropTypes from 'prop-types';
import SearchBar from '../SearchBar/SearchBar';

export default function PatientList({ patients, query, onQuery, onSelect }) {
  return (
    <section className="patient-panel" aria-labelledby="patients-heading">
      <div className="patient-panel-header">
        <h3 id="patients-heading">Patients</h3>
        <span className="patient-count">{patients.length} shown</span>
      </div>

      <SearchBar value={query} onChange={onQuery} placeholder="Search patients by name or email" />

      {patients.length === 0 ? (
        <p className="patient-empty">No patients match that search.</p>
      ) : (
        <ul className="patient-list" aria-label="Patients">
          {patients.map((p) => (
            <li key={p._id} className="patient-card">
              <button
                type="button"
                className="patient-card-btn"
                onClick={() => onSelect(p)}
                aria-label={`Open ${p.name}'s records`}
              >
                <span className="patient-avatar" aria-hidden="true">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="patient-info">
                  <span className="patient-name">{p.name}</span>
                  <span className="patient-meta">
                    {p.email} · {p.recordCount} record{p.recordCount === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="patient-open" aria-hidden="true">
                  View →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

PatientList.propTypes = {
  patients: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      recordCount: PropTypes.number.isRequired,
    })
  ).isRequired,
  query: PropTypes.string.isRequired,
  onQuery: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
};
