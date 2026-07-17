import React, { useState } from 'react';
import PropTypes from 'prop-types';
import RecordModal from '../RecordModal/RecordModal';
import './RecordList.css';

export default function RecordList({ records, onSelect, activeId, onRefresh, isSearching }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <div className="record-list-header">
        <h3>MY RECORDS</h3>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModal(true);
          }}
        >
          + Add
        </button>
      </div>
      {records.length === 0 ? (
        isSearching ? (
          <div className="empty-state">
            <h4>No matching records</h4>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="empty-state">
            <h4>No records yet</h4>
            <p>Add your first medical record to begin tracking who accesses it.</p>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              + Add your first record
            </button>
          </div>
        )
      ) : (
        records.map((rec) => (
          <div key={rec._id} className={`record-card ${activeId === rec._id ? 'active' : ''}`}>
            <button type="button" className="record-card-select" onClick={() => onSelect(rec)}>
              <span className="record-card-title">{rec.title}</span>
              <span className="record-card-type">{rec.type}</span>
            </button>
            <button
              type="button"
              className="record-card-edit"
              onClick={() => {
                setEditing(rec);
                setModal(true);
              }}
            >
              Edit
            </button>
          </div>
        ))
      )}
      {modal && (
        <RecordModal record={editing} onClose={() => setModal(false)} onSaved={onRefresh} />
      )}
    </div>
  );
}
RecordList.propTypes = {
  records: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  activeId: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
  isSearching: PropTypes.bool,
};
