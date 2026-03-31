import { Card } from './Card';

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
      className={`flex flex-col items-start gap-4 text-left ${className || ''}`}
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gatorOrange/12 text-gatorOrange">
          {icon}
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
