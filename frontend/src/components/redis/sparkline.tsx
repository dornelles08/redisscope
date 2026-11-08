import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  colorClass?: string;
}

export function Sparkline({ data, width = 120, height = 32, className, colorClass = 'text-primary' }: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const points = data.map((v, i) => {
      const x = i * step;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return [x, y] as const;
    });
    return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }, [data, width, height]);

  const area = useMemo(() => {
    if (!path) return null;
    return `${path} L${width},${height} L0,${height} Z`;
  }, [path, width, height]);

  if (!path || !area) {
    return (
      <div className={cn('flex items-center text-xs text-slate-400', className)} style={{ width, height }}>
        Sem dados
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label="Gráfico de linha"
    >
      <path d={area} fill="currentColor" opacity="0.1" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" className={colorClass} />
      <circle cx={width} cy={2} r="2.5" fill="currentColor" className={colorClass} opacity="0" />
    </svg>
  );
}
