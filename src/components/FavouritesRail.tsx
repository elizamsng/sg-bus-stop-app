import { Clock, Star } from 'lucide-react';
import { getBusStopByCode } from '../services/busApi';
import { FavouriteStop, PinnedService } from '../types/bus';

interface FavouritesRailProps {
  activeCode: string;
  favouriteStops: FavouriteStop[];
  pinnedServices: PinnedService[];
  recentStopCodes: string[];
  onSelectStop: (code: string) => void;
  onOpenFavouritesView: () => void;
}

export function FavouritesRail({
  activeCode,
  favouriteStops,
  pinnedServices,
  recentStopCodes,
  onSelectStop,
  onOpenFavouritesView,
}: FavouritesRailProps) {
  return (
    <aside aria-label="Saved and recent bus stops" className="space-y-5">
      {/* Saved Favourite Stops */}
      <section className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#C81E1E] fill-[#C81E1E]" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-[#111827]">
              Favourite Stops
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenFavouritesView}
            className="text-xs font-medium text-[#6B7280] hover:text-[#111827] transition-colors whitespace-nowrap shrink-0"
          >
            Manage
          </button>
        </div>

        {favouriteStops.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[#6B7280]">
            No saved stops yet. Star any bus stop on the arrival board for one-tap access.
          </div>
        ) : (
          <ul className="divide-y divide-[#F3F4F6]">
            {favouriteStops.map((fav) => {
              const isSelected = fav.busStopCode === activeCode;
              const pinnedCount = pinnedServices.filter(
                (p) => p.busStopCode === fav.busStopCode
              ).length;

              return (
                <li key={fav.busStopCode}>
                  <button
                    type="button"
                    onClick={() => onSelectStop(fav.busStopCode)}
                    className={`w-full text-left px-5 py-3.5 min-h-[56px] flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[#FEF2F2] text-[#111827]'
                        : 'hover:bg-[#F9FAFB] text-[#111827]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-[#C81E1E] text-white'
                              : 'bg-[#111827] text-white'
                          }`}
                        >
                          {fav.busStopCode}
                        </span>
                        <span className="text-sm font-semibold truncate">
                          {fav.nickname || fav.description}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[#6B7280] truncate">
                        {fav.nickname ? `${fav.description} · ` : ''}
                        {fav.roadName}
                        {pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ''}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent Lookups */}
      <section className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#6B7280]" aria-hidden="true" />
          <h2 className="font-display text-sm font-semibold text-[#111827]">
            Recent Lookups
          </h2>
        </div>

        <ul className="divide-y divide-[#F3F4F6]">
          {recentStopCodes.map((code) => {
            const info = getBusStopByCode(code);
            const isSelected = code === activeCode;
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => onSelectStop(code)}
                  className={`w-full text-left px-5 py-3 min-h-[48px] flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-[#F9FAFB]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-medium tabular-nums text-[#374151]">
                      {code}
                    </span>
                    <span className="text-sm text-[#111827] truncate">
                      {info ? info.Description : `Stop ${code}`}
                    </span>
                  </div>
                  <span className="text-xs text-[#6B7280] shrink-0">
                    {isSelected ? 'Active' : 'Open'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
