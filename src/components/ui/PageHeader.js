import { cn } from '../../lib/ui';
import { AppIcon } from './Icon';

export function PageHeader({
  eyebrow,
  icon,
  title,
  description,
  actions,
  align = 'left',
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' ? 'text-center sm:text-left' : '',
        className
      )}
    >
      <div className="space-y-3">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-gatorOrange">
            {icon ? (
              <AppIcon icon={icon} className="text-xs" />
            ) : null}
            <span>{eyebrow}</span>
          </p>
        ) : null}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-7 text-app-soft sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}
