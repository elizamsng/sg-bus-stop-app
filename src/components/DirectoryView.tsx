import { ArrowRight, MapPin, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getAllBusStops } from '../services/busApi';
import { BusStopRecord, SingaporeRegion } from '../types/bus';

interface DirectoryViewProps {
  onSelectStop: (code: string) => void;
  isStopFavourited: (code: string) => boolean;
  onToggleFavouriteStop: (stop: BusStopRecord) => void;
}

const REGIONS: Array<'All' | SingaporeRegion> = [
  'All',
  'Central',
  'East',
  'West',
  'North',
  'North-East',
];

export function DirectoryView({
  onSelectStop,
  isStopFavourited,
  onToggleFavouriteStop,
}: DirectoryViewProps) {
  const [region, setRegion] = useState<'All' | SingaporeRegion>('All');
  const [query, setQuery] = useState('');

  const allStops = useMemo(() => getAllBusStops(), []);

  const filteredStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStops.filter((stop) => {
      if (region !== 'All' && stop.Region !== region) return false;
      if (!q) return true;
      return (
        stop.BusStopCode.includes(q) ||
        stop.Description.toLowerCase().includes(q) ||
        stop.RoadName.toLowerCase().includes(q) ||
        stop.Services.some((s) => s.serviceNo.toLowerCase().includes(q))
      );
    });
  }, [allStops, region, query]);

  return (
    <section className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
      <div className="p-6 border-b border-[#E5E7EB]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-[#111827]">
              Singapore Bus Stop Directory
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Browse preloaded interchanges and major stops across Singapore, or search any 5-digit code in the main bar.
            </p>
          </div>
          <span className="text-xs font-medium text-[#6B7280] tabular-nums">
            Showing {filteredStops.length} of {allStops.length} stops
          </span>
        </div>

        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter by region"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg"
          >
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  region === r
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by code, road, or service..."
              aria-label="Filter stop directory"
              className="w-full h-[42px] pl-9 pr-3 text-sm bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#C81E1E]"
            />
          </div>
        </div>
      </div>

      {filteredStops.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-[#111827]">
            No bus stops match &ldquo;{query}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setRegion('All');
              setQuery('');
            }}
            className="mt-4 inline-flex items-center min-h-[40px] px-4 py-2 text-xs font-semibold bg-[#111827] text-white rounded-lg hover:bg-[#1F2937]"
          >
            Reset Directory Filter
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {filteredStops.map((stop) => {
            const saved = isStopFavourited(stop.BusStopCode);
            return (
              <li
                key={stop.BusStopCode}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFB] transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <span className="font-mono text-sm font-bold tabular-nums px-2.5 py-1.5 rounded-lg bg-[#111827] text-white shrink-0">
                    {stop.BusStopCode}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-[#111827] truncate">
                      {stop.Description}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B7280]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        {stop.RoadName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{stop.Region}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-[#374151]">
                        Services: {stop.Services.map((s) => s.serviceNo).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleFavouriteStop(stop)}
                    aria-pressed={saved}
                    aria-label={
                      saved
                        ? `Remove ${stop.Description} from favourites`
                        : `Save ${stop.Description} to favourites`
                    }
                    className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border transition-colors ${
                      saved
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#C81E1E]'
                        : 'bg-white border-[#D1D5DB] text-[#6B7280] hover:text-[#111827]'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${saved ? 'fill-[#C81E1E]' : ''}`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectStop(stop.BusStopCode)}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#111827] hover:bg-[#1F2937] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Check Timings</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
