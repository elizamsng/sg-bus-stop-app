import { ArrowRight, Check, Pencil, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  fetchBusArrival,
  formatArrivalLabel,
  formatClockTime,
  getLoadMeta,
  getMinutesUntil,
} from '../services/busApi';
import { BusServiceArrival, FavouriteStop, PinnedService } from '../types/bus';

interface FavouritesViewProps {
  favouriteStops: FavouriteStop[];
  pinnedServices: PinnedService[];
  nowMs: number;
  refreshNonce: number;
  onSelectStop: (code: string) => void;
  onRemoveFavouriteStop: (code: string) => void;
  onUpdateStopNickname: (code: string, nickname: string) => void;
  onUnpinService: (
    busStopCode: string,
    stopDescription: string,
    serviceNo: string,
    destination: string
  ) => void;
  onBrowseDirectory: () => void;
}

export function FavouritesView({
  favouriteStops,
  pinnedServices,
  nowMs,
  refreshNonce,
  onSelectStop,
  onRemoveFavouriteStop,
  onUpdateStopNickname,
  onUnpinService,
  onBrowseDirectory,
}: FavouritesViewProps) {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [liveByStop, setLiveByStop] = useState<Record<string, BusServiceArrival[]>>({});

  useEffect(() => {
    let active = true;
    const uniqueStopCodes = Array.from(
      new Set(pinnedServices.map((p) => p.busStopCode))
    );

    if (uniqueStopCodes.length === 0) {
      setLiveByStop({});
      return;
    }

    Promise.all(
      uniqueStopCodes.map((code) =>
        fetchBusArrival(code, { simulateCustomStop: true, refreshNonce })
      )
    ).then((results) => {
      if (!active) return;
      const map: Record<string, BusServiceArrival[]> = {};
      results.forEach((res) => {
        map[res.BusStopCode] = res.Services;
      });
      setLiveByStop(map);
    });

    return () => {
      active = false;
    };
  }, [pinnedServices, refreshNonce]);

  return (
    <div className="space-y-8">
      {/* Pinned Services Live Monitor */}
      <section className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-xl font-bold text-[#111827]">
              Pinned Bus Services
            </h1>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              Live countdowns for your pinned services across any saved bus stop.
            </p>
          </div>
          <span className="text-xs font-medium text-[#6B7280] tabular-nums">
            {pinnedServices.length} pinned
          </span>
        </div>

        {pinnedServices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-[#111827]">
              No pinned bus services yet.
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Star any service row on a stop&apos;s arrival board to track it here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {pinnedServices.map((item) => {
              const services = liveByStop[item.busStopCode] ?? [];
              const live = services.find((s) => s.ServiceNo === item.serviceNo);
              const nextMin = live
                ? getMinutesUntil(live.NextBus.EstimatedArrival, nowMs)
                : null;
              const secondMin = live
                ? getMinutesUntil(live.NextBus2.EstimatedArrival, nowMs)
                : null;
              const load = live ? getLoadMeta(live.NextBus.Load) : null;

              return (
                <li
                  key={`${item.busStopCode}-${item.serviceNo}`}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFB] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-[64px] px-2.5 py-2 rounded-lg bg-[#111827] text-white text-center font-mono text-base font-bold tabular-nums shrink-0">
                      {item.serviceNo}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectStop(item.busStopCode)}
                        className="text-left text-sm sm:text-base font-semibold text-[#111827] hover:text-[#C81E1E] transition-colors truncate block"
                      >
                        {item.stopDescription}{' '}
                        <span className="font-mono text-xs text-[#6B7280] tabular-nums">
                          ({item.busStopCode})
                        </span>
                      </button>
                      <div className="mt-0.5 text-xs text-[#6B7280] truncate">
                        To {item.destination}
                        {live ? ` · ${live.Operator}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pl-[80px] sm:pl-0">
                    {live ? (
                      <div className="flex items-center gap-6">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`font-mono text-xl font-bold tabular-nums ${
                                nextMin !== null && nextMin <= 0
                                  ? 'text-[#C81E1E]'
                                  : 'text-[#111827]'
                              }`}
                            >
                              {formatArrivalLabel(nextMin)}
                            </span>
                            {nextMin !== null && nextMin > 0 && (
                              <span className="text-xs text-[#6B7280]">min</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#6B7280] tabular-nums">
                            {formatClockTime(live.NextBus.EstimatedArrival)} ·{' '}
                            <span className={load?.textClass}>{load?.label}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-sm font-semibold tabular-nums text-[#374151]">
                            {formatArrivalLabel(secondMin)}{' '}
                            {secondMin !== null && secondMin > 0 ? 'min' : ''}
                          </div>
                          <div className="text-[11px] text-[#6B7280]">2nd bus</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#6B7280]">Loading timings...</span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onSelectStop(item.busStopCode)}
                        aria-label={`Open ${item.stopDescription}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUnpinService(
                            item.busStopCode,
                            item.stopDescription,
                            item.serviceNo,
                            item.destination
                          )
                        }
                        aria-label={`Remove pinned service ${item.serviceNo}`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Saved Bus Stops */}
      <section className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111827]">
              Saved Bus Stops
            </h2>
            <p className="mt-0.5 text-sm text-[#6B7280]">
              Organize your regular stops with custom labels such as Home, Office, or MRT.
            </p>
          </div>
          <span className="text-xs font-medium text-[#6B7280] tabular-nums">
            {favouriteStops.length} saved
          </span>
        </div>

        {favouriteStops.length === 0 ? (
          <div className="p-10 text-center">
            <Star className="w-6 h-6 text-[#D1D5DB] mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-[#111827]">No saved bus stops</p>
            <p className="mt-1 text-xs text-[#6B7280]">
              Browse the stop directory or search a 5-digit code to save stops here.
            </p>
            <button
              type="button"
              onClick={onBrowseDirectory}
              className="mt-4 inline-flex items-center min-h-[44px] px-4 py-2 text-sm font-medium bg-[#111827] text-white rounded-lg hover:bg-[#1F2937]"
            >
              Browse Stop Directory
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#E5E7EB]">
            {favouriteStops.map((fav) => {
              const isEditing = editingCode === fav.busStopCode;

              return (
                <li
                  key={fav.busStopCode}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFB] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-sm font-bold tabular-nums px-2.5 py-1.5 rounded-lg bg-[#111827] text-white shrink-0">
                      {fav.busStopCode}
                    </span>

                    <div className="min-w-0">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            onUpdateStopNickname(fav.busStopCode, draftName);
                            setEditingCode(null);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder="Label (e.g. Home)"
                            maxLength={24}
                            autoFocus
                            className="h-9 px-3 text-sm bg-white border border-[#D1D5DB] rounded-md text-[#111827] focus:outline-none focus:border-[#C81E1E]"
                          />
                          <button
                            type="submit"
                            aria-label="Save label"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center bg-[#111827] text-white rounded-md hover:bg-[#1F2937]"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm sm:text-base font-semibold text-[#111827] truncate">
                              {fav.nickname || fav.description}
                            </span>
                            {fav.nickname && (
                              <span className="text-xs text-[#6B7280] truncate">
                                ({fav.description})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#6B7280] mt-0.5">
                            {fav.roadName}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCode(fav.busStopCode);
                        setDraftName(fav.nickname);
                      }}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Label</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectStop(fav.busStopCode)}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 text-xs font-semibold text-white bg-[#111827] rounded-lg hover:bg-[#1F2937] transition-colors"
                    >
                      <span>View Arrivals</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFavouriteStop(fav.busStopCode)}
                      aria-label={`Remove ${fav.description} from favourites`}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
