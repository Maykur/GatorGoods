import { cn } from '../../lib/ui';

export function Skeleton({className}) {
  return (
    <div
      className={cn(
        'animate-pulse-soft rounded-2xl bg-white/8',
        className
      )}
      aria-hidden="true"
    />
  );
}
