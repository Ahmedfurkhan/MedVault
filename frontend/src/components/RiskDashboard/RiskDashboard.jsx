import React from 'react';
import PropTypes from 'prop-types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import RiskScoreCard from '../RiskScoreCard/RiskScoreCard';
import './RiskDashboard.css';

export default function RiskDashboard({ data, theme = 'light' }) {
  const chart =
    theme === 'dark'
      ? {
          grid: '#234049',
          axis: '#9db3bb',
          views: '#2dd4bf',
          viewsFill: 'rgba(45, 212, 191, 0.14)',
          anomaly: '#f87171',
          anomalyFill: 'rgba(248, 113, 113, 0.14)',
        }
      : {
          grid: '#d9e7ea',
          axis: '#5c7580',
          views: '#0d9488',
          viewsFill: 'rgba(13, 148, 136, 0.12)',
          anomaly: '#ef4444',
          anomalyFill: 'rgba(239, 68, 68, 0.1)',
        };

  const totalViews = data.trendData.reduce((sum, d) => sum + (d.accessCount || 0), 0);
  const totalFlags = data.trendData.reduce((sum, d) => sum + (d.flagCount || 0), 0);
  const chartSummary = `Trend of daily record access over ${data.trendData.length} days: ${totalViews} total views and ${totalFlags} flagged anomalies.`;

  return (
    <div className="dashboard-layout">
      <h2 className="sr-only">Security and risk dashboard</h2>
      <div className="metrics-row">
        <RiskScoreCard score={data.riskScore} severity={data.severityLabel} />
        <div className="stat-card">
          <h3>OFF-HOURS INCIDENTS</h3>
          <span className="stat-count">{data.offHoursCount}</span>
        </div>
        <div className="stat-card">
          <h3>RECENT VIEW BURSTS</h3>
          <span className="stat-count">{data.viewBurstCount}</span>
        </div>
        <div className="stat-card">
          <h3>NEW-DEVICE ALERTS</h3>
          <span className="stat-count">{data.newDeviceCount}</span>
        </div>
      </div>

      <section className="chart-section" aria-labelledby="trend-heading">
        <h3 id="trend-heading">ACCESS VOLUME &amp; FLAGS TREND</h3>
        <p className="sr-only">{chartSummary}</p>
        <div style={{ width: '100%', height: 250 }} aria-hidden="true">
          <ResponsiveContainer>
            <AreaChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chart.grid} />
              <XAxis
                dataKey="_id"
                tick={{ fontSize: 12, fill: chart.axis }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 12, fill: chart.axis }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="accessCount"
                name="Total Views"
                stroke={chart.views}
                fill={chart.viewsFill}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="flagCount"
                name="Anomalies"
                stroke={chart.anomaly}
                fill={chart.anomalyFill}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="alerts-section" aria-labelledby="alerts-heading">
        <h3 id="alerts-heading">SECURITY ALERTS (AI EXPLAINED)</h3>
        <ul className="alert-list">
          {data.alerts.map((alert) => (
            <li key={alert._id} className="alert-row">
              <span className="alert-indicator" aria-hidden="true">
                ⚠️
              </span>
              <div className="alert-text">
                <div className="alert-head">
                  <p className="alert-desc">
                    <strong>System Flag:</strong> {alert.flags.join(', ')}
                  </p>
                  {alert.aiSeverity && (
                    <span className={`severity-badge severity-${alert.aiSeverity}`}>
                      {alert.aiSeverity} risk
                    </span>
                  )}
                </div>
                <p className="alert-ai">
                  <strong>AI Analysis:</strong> {alert.aiExplanation}
                </p>
                {alert.aiAction && (
                  <p className="alert-action">
                    <strong>Recommended:</strong> {alert.aiAction}
                  </p>
                )}
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleString()} | IP: {alert.ipAddress}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
RiskDashboard.propTypes = {
  data: PropTypes.shape({
    riskScore: PropTypes.number.isRequired,
    severityLabel: PropTypes.string.isRequired,
    offHoursCount: PropTypes.number.isRequired,
    viewBurstCount: PropTypes.number.isRequired,
    newDeviceCount: PropTypes.number.isRequired,
    alerts: PropTypes.array.isRequired,
    trendData: PropTypes.array.isRequired,
  }).isRequired,
  theme: PropTypes.oneOf(['light', 'dark']),
};
