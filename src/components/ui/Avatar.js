import { getInitials, cn } from '../../lib/ui';

const SIZE_CLASSES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  className,
}) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn(
          'rounded-2xl border border-white/10 object-cover',
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center rounded-2xl border border-white/10 bg-brand-blue/20 font-semibold text-white',
        sizeClass,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
