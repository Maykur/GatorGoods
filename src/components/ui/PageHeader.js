import { cn } from '../../lib/ui';

export function PageHeader({
  eyebrow,
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
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-gatorOrange">
            {eyebrow}
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
