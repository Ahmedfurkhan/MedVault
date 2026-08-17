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
  PieChart,
  Pie,
  Cell,
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

  // Donut: breakdown of the flagged access by anomaly type.
  const donutColors =
    theme === 'dark'
      ? { offHours: '#fbbf24', viewBurst: '#f87171', newDevice: '#2dd4bf' }
      : { offHours: '#f59e0b', viewBurst: '#ef4444', newDevice: '#0d9488' };
  const donut = [
    { name: 'Off-hours', value: data.offHoursCount, color: donutColors.offHours },
    { name: 'View bursts', value: data.viewBurstCount, color: donutColors.viewBurst },
    { name: 'New device', value: data.newDeviceCount, color: donutColors.newDevice },
  ];
  const donutTotal = donut.reduce((sum, d) => sum + d.value, 0);
  const donutData = donut.filter((d) => d.value > 0);
  const donutSummary = `Anomaly breakdown: ${data.offHoursCount} off-hours, ${data.viewBurstCount} view bursts, and ${data.newDeviceCount} new-device alerts.`;

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

      <div className="chart-grid">
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
                <YAxis
                  tick={{ fontSize: 12, fill: chart.axis }}
                  tickLine={false}
                  axisLine={false}
                />
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

        <section className="chart-section" aria-labelledby="donut-heading">
          <h3 id="donut-heading">ANOMALY BREAKDOWN</h3>
          <p className="sr-only">{donutSummary}</p>
          {donutTotal === 0 ? (
            <p className="donut-empty">
              No anomalies detected — nothing unusual in your access history.
            </p>
          ) : (
            <div className="donut-wrap">
              <div className="donut-canvas" aria-hidden="true">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="none"
                      rootTabIndex={-1}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center" aria-hidden="true">
                  <span className="donut-center-value">{donutTotal}</span>
                  <span className="donut-center-label">flags</span>
                </div>
              </div>
              <ul className="donut-legend">
                {donut.map((d) => (
                  <li key={d.name}>
                    <span
                      className="donut-swatch"
                      style={{ background: d.color }}
                      aria-hidden="true"
                    />
                    {d.name}: <strong>{d.value}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

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
