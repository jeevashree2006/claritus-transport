import './Sparkline.css';

/**
 * Tiny SVG trend line. Colour comes from CSS `color` (currentColor), so set it
 * with a class on the parent - never pass a hex value.
 *
 *   <Sparkline data={[3, 5, 4, 8, 7, 10]} />
 */
export function Sparkline({ data = [], width = 88, height = 32, strokeWidth = 2, className = '' }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth; // keep the stroke inside the box

  const points = data.map((value, index) => {
    const x = pad + (index / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${pad},${height} ${line} ${width - pad},${height}`;

  return (
    <svg
      className={['sparkline', className].filter(Boolean).join(' ')}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={area} className="sparkline__area" />
      <polyline points={line} className="sparkline__line" strokeWidth={strokeWidth} />
    </svg>
  );
}

export default Sparkline;
