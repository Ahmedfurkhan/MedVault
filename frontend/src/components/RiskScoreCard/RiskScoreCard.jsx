import React from 'react';
import PropTypes from 'prop-types';
import './RiskScoreCard.css';

export default function RiskScoreCard({ score, severity }) {
  const getBandColor = (val) => {
    if (val <= 30) return '#10b981';
    if (val <= 70) return '#f59e0b';
    return '#ef4444';
  };
  const color = getBandColor(score);

  return (
    <div className="risk-card">
      <h3>DYNAMIC RISK SCORE</h3>
      <div className="circle-container" style={{ borderColor: color }}>
        <span className="score-value" style={{ color: color }}>
          {score}
        </span>
      </div>
      <p className="severity-text" style={{ backgroundColor: `${color}15`, color: color }}>
        {severity}
      </p>
    </div>
  );
}
RiskScoreCard.propTypes = {
  score: PropTypes.number.isRequired,
  severity: PropTypes.string.isRequired,
};
