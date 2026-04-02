import { useEffect, useState } from 'react';
import { AppIcon, Card } from './ui';
import { APPROVED_PICKUP_HUBS, getPickupHubById } from '../lib/pickupHubs';
import { cn } from '../lib/ui';
import campusPickupMap from '../assets/uf_map_ui_slate_blue.png';

function MapBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden rounded-[1.75rem] bg-[linear-gradient(145deg,rgba(13,38,76,0.96),rgba(8,20,43,0.92))]"
    >
      <img
        src={campusPickupMap}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,112,10,0.18),_transparent_30%),linear-gradient(180deg,rgba(8,20,43,0.08),rgba(8,20,43,0.24))]" />
      <div className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-app-soft">
        Campus Map
      </div>
    </div>
  );
}

function MapPin({ hub, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
      style={{
        left: `${hub.mapX}%`,
        top: `${hub.mapY}%`,
      }}
      onClick={() => onSelect(hub.id)}
      aria-label={`Select ${hub.label}`}
      aria-pressed={isSelected}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border shadow-lg transition-all duration-200',
          isSelected
            ? 'scale-105 border-gatorOrange bg-gatorOrange text-white shadow-[0_10px_24px_rgba(250,112,10,0.34)]'
            : 'border-white/15 bg-app-surface/90 text-app-soft group-hover:border-gatorOrange/45 group-hover:text-white'
        )}
      >
        <AppIcon icon="location" className="text-sm" />
      </span>
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200',
          isSelected
            ? 'border-gatorOrange/35 bg-gatorOrange/16 text-white'
            : 'border-white/10 bg-app-surface/90 text-app-soft opacity-0 shadow-lg group-hover:opacity-100'
        )}
      >
        {hub.shortLabel}
      </span>
    </button>
  );
}

function HubOptionCard({ hub, index, isSelected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={() => onSelect(hub.id)}
      className={cn(
        'focus-ring flex w-full items-start gap-3 rounded-[1.2rem] border px-3.5 py-3.5 text-left transition-all duration-200 sm:gap-4 sm:rounded-[1.4rem] sm:px-4 sm:py-4',
        isSelected
          ? 'border-gatorOrange/45 bg-gatorOrange/10'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[0.7rem] font-semibold sm:h-8 sm:w-8 sm:text-xs',
          isSelected
            ? 'border-gatorOrange bg-gatorOrange text-white'
            : 'border-white/10 bg-app-surface/80 text-app-soft'
        )}
      >
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <span>{hub.label}</span>
          <span className="inline-flex items-center justify-center text-center leading-[0.8rem] rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.2em] text-app-muted sm:leading-[0.55rem] sm:text-[0.65rem]">
            {hub.area}
          </span>
        </span>
        <span className="block text-sm leading-5 text-app-soft sm:leading-6">{hub.description}</span>
      </span>
      {isSelected ? (
        <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-gatorOrange/35 bg-gatorOrange/16 text-gatorOrange sm:h-8 sm:w-8">
          <AppIcon icon="verified" className="text-sm" />
        </span>
      ) : null}
    </button>
  );
}

export function PickupHubPicker({
  id = 'pickup-hub',
  label = 'Pickup hub',
  description = 'Choose one approved public campus meetup hub.',
  error = '',
  required = false,
  selectedHubId = '',
  onChange,
}) {
  const selectedHub = getPickupHubById(selectedHubId);
  const [showMapHint, setShowMapHint] = useState(true);
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowMapHint(false);
    }, 15000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p id={labelId} className="text-sm font-semibold text-app-text">
          <span>{label}</span>
          {required ? <span className="ml-1 text-gatorOrange">*</span> : null}
        </p>
        <p id={descriptionId} className="text-sm text-app-muted">
          {description}
        </p>
      </div>

      <Card className="space-y-5 overflow-hidden p-4 sm:p-5">
        <div className="hidden sm:block">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/10 bg-app-surface/80">
            <MapBackground />
            <div className="absolute inset-0">
              {APPROVED_PICKUP_HUBS.map((hub) => (
                <MapPin
                  key={hub.id}
                  hub={hub}
                  isSelected={hub.id === selectedHubId}
                  onSelect={onChange}
                />
              ))}
            </div>
            <div
              className={cn(
                'absolute bottom-4 left-4 max-w-[16rem] rounded-[1.25rem] border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-sm transition-opacity duration-700',
                showMapHint ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gatorOrange">
                Approved public meetup hubs
              </p>
              <p className="mt-1 text-sm leading-6 text-app-soft">
                Choose a pin or pick from the list below.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gatorOrange/20 bg-gatorOrange/10 text-gatorOrange">
              <AppIcon icon="location" className="text-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">
                Selected hub
              </p>
              <p className="mt-1 text-base font-semibold text-white">
                {selectedHub?.label || 'Choose a public campus pickup hub'}
              </p>
              <p className="mt-1 text-sm leading-6 text-app-soft">
                {selectedHub?.description || 'Your listing will use this approved UF meetup spot everywhere it is shown.'}
              </p>
            </div>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-labelledby={labelId}
          aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
          className="grid gap-3 sm:hidden"
        >
          {APPROVED_PICKUP_HUBS.map((hub, index) => (
            <HubOptionCard
              key={hub.id}
              hub={hub}
              index={index}
              isSelected={hub.id === selectedHubId}
              onSelect={onChange}
            />
          ))}
        </div>
      </Card>

      {error ? (
        <p id={errorId} className="text-sm font-medium text-app-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
