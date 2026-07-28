import React from 'react';
import PropTypes from 'prop-types';
import './RiskScoreCard.css';

export default function RiskScoreCard({ score, severity }) {
  // Map the score to a named band; the actual color comes from theme-aware
  // CSS variables so contrast passes in both light and dark mode.
  const band = score <= 30 ? 'low' : score <= 70 ? 'medium' : 'high';
  const color = `var(--risk-${band})`;

  return (
    <div className="risk-card">
      <h3 id="risk-score-heading">DYNAMIC RISK SCORE</h3>
      <div
        className={`circle-container band-${band}`}
        role="meter"
        aria-labelledby="risk-score-heading"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${score} out of 100, ${severity}`}
      >
        <span className="score-value" style={{ color }}>
          {score}
        </span>
      </div>
      <p className={`severity-text band-${band}`}>{severity}</p>
    </div>
  );
}
RiskScoreCard.propTypes = {
  score: PropTypes.number.isRequired,
  severity: PropTypes.string.isRequired,
};
