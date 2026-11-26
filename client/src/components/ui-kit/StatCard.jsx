import { ArrowDown, ArrowUp } from 'lucide-react';
import { Sparkline } from './Sparkline';
import './StatCard.css';

/**
 * KPI card: coloured icon tile, label, big number, sparkline and trend.
 *
 * Props:
 *   label, value
 *   icon       lucide icon component
 *   tone       'primary' | 'success' | 'warning' | 'danger'
 *   trend      { value: '12%', direction: 'up' | 'down', good: true | false, label?: 'vs last month' }
 *              `good` decides the colour (a falling "Delayed" count is good news).
 *   sparkline  array of numbers
 */
export function StatCard({ label, value, icon: Icon, tone = 'primary', trend, sparkline, className = '' }) {
  const TrendIcon = trend?.direction === 'down' ? ArrowDown : ArrowUp;

  return (
    <article className={['stat-card', `stat-card--${tone}`, className].filter(Boolean).join(' ')}>
      <div className="stat-card__head">
        {Icon && (
          <span className="stat-card__icon" aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
        <h3 className="stat-card__label">{label}</h3>
      </div>

      <div className="stat-card__body">
        <p className="stat-card__value">{value}</p>
        {sparkline && <Sparkline data={sparkline} className="stat-card__spark" />}
      </div>

      {trend && (
        <p className={`stat-card__trend ${trend.good ? 'stat-card__trend--good' : 'stat-card__trend--bad'}`}>
          <TrendIcon size={14} aria-hidden="true" />
          <span>
            <span className="sr-only">{trend.direction === 'down' ? 'Down' : 'Up'} </span>
            {trend.value}
          </span>
          <span className="stat-card__trend-label">{trend.label || 'vs last month'}</span>
        </p>
      )}
    </article>
  );
}

export default StatCard;
