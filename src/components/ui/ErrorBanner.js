import { cn } from '../../lib/ui';

export function ErrorBanner({title = 'Something went wrong', message, className}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-app-danger/35 bg-app-danger/10 px-4 py-3 text-sm text-red-100',
        className
      )}
    >
      <p className="font-semibold text-red-50">{title}</p>
      {message ? <p className="mt-1 leading-6 text-red-100/90">{message}</p> : null}
    </div>
  );
}
