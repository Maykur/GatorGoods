import { isValidElement } from 'react';
import { cn } from '../../lib/ui';
import { Card } from './Card';
import { AppIcon } from './Icon';

function renderEmptyStateIcon(icon) {
  if (!icon) {
    return null;
  }

  if (typeof icon === 'string') {
    return <AppIcon icon={icon} className="text-lg" />;
  }

  if (isValidElement(icon)) {
    return icon;
  }

  return <AppIcon icon={icon} className="text-lg" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <Card
      variant="subtle"
      padding="lg"
      className={cn('flex flex-col items-start gap-4 text-left', className)}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gatorOrange/15 bg-gatorOrange/12 text-gatorOrange shadow-[0_12px_30px_-22px_rgba(250,70,22,0.85)]">
          {renderEmptyStateIcon(icon)}
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description ? <p className="max-w-xl text-sm leading-7 text-app-muted">{description}</p> : null}
      </div>
      {action || null}
    </Card>
  );
}
