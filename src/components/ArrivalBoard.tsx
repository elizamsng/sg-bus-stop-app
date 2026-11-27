import {
  Accessibility,
  ChevronDown,
  ChevronUp,
  Code2,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  formatArrivalLabel,
  formatClockTime,
  getBusTypeLabel,
  getLoadMeta,
  getMinutesUntil,
} from '../services/busApi';
import {
  BusArrivalResponse,
  BusServiceArrival,
  BusStopRecord,
  FavouriteStop,
  NextBusSlot,
} from '../types/bus';

interface ArrivalBoardProps {
  busStopCode: string;
  data: BusArrivalResponse | null;
  isLoading: boolean;
  error: string | null;
  nowMs: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onSimulateCustomStop: () => void;
  onSelectStop: (code: string) => void;
  isStopFavourited: boolean;
  favouriteEntry: FavouriteStop | undefined;
  onToggleFavouriteStop: (stop: BusStopRecord) => void;
  onUpdateStopNickname: (code: string, nickname: string) => void;
  isServicePinned: (busStopCode: string, serviceNo: string) => boolean;
  onTogglePinnedService: (
    busStopCode: string,
    stopDescription: string,
    serviceNo: string,
    destination: string
  ) => void;
}

type ServiceFilter = 'all' | 'pinned' | 'wab';

function BusSlotCell({
  slot,
  isPrimary,
  nowMs,
}: {
  slot: NextBusSlot;
  isPrimary: boolean;
  nowMs: number;
}) {
  const minutes = getMinutesUntil(slot.EstimatedArrival, nowMs);
  const label = formatArrivalLabel(minutes);
  const isArrivingNow = minutes !== null && minutes <= 0;
  const load = getLoadMeta(slot.Load);
  const clock = formatClockTime(slot.EstimatedArrival);
  const typeLabel = getBusTypeLabel(slot.Type);

  return (
    <div
      className={`min-w-[88px] sm:min-w-[104px] flex flex-col ${
        isPrimary ? 'items-start sm:items-end' : 'items-start sm:items-end'
      }`}
    >
      <div className="flex items-baseline gap-1">
        <span
          className={`font-mono tabular-nums font-bold leading-none ${
            isPrimary ? 'text-2xl' : 'text-lg'
          } ${
            isArrivingNow
              ? 'text-[#C81E1E]'
              : isPrimary
              ? 'text-[#111827]'
              : 'text-[#374151]'
          }`}
        >
          {label}
        </span>
        {minutes !== null && minutes > 0 && (
          <span className="text-xs font-medium text-[#6B7280]">min</span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#6B7280] tabular-nums">
        <span>{clock}</span>
        <span aria-hidden="true">·</span>
        <span>{slot.Type || 'SD'}</span>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-xs ${load.barClass}`}
          aria-hidden="true"
        />
        <span
          className={`text-[11px] font-medium ${load.textClass}`}
          title={`${load.label} · ${typeLabel}`}
        >
          {load.label}
        </span>
      </div>
    </div>
  );
}

export function ArrivalBoard({
  busStopCode,
  data,
  isLoading,
  error,
  nowMs,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh,
  onSimulateCustomStop,
  onSelectStop,
  isStopFavourited,
  favouriteEntry,
  onToggleFavouriteStop,
  onUpdateStopNickname,
  isServicePinned,
  onTogglePinnedService,
}: ArrivalBoardProps) {
  const [filterMode, setFilterMode] = useState<ServiceFilter>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [showJsonFor, setShowJsonFor] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');

  const stopInfo = data?.StopInfo ?? null;
  const services = data?.Services ?? [];

  const sortedAndFilteredServices: BusServiceArrival[] = useMemo(() => {
    const q = serviceQuery.trim().toLowerCase();

    const filtered = services.filter((svc) => {
      if (q && !svc.ServiceNo.toLowerCase().includes(q)) return false;
      if (filterMode === 'pinned' && !isServicePinned(busStopCode, svc.ServiceNo)) {
        return false;
      }
      if (filterMode === 'wab' && svc.NextBus.Feature !== 'WAB') {
        return false;
      }
      return true;
    });

    // Float pinned services to the top while preserving numerical service order
    return [...filtered].sort((a, b) => {
      const aPinned = isServicePinned(busStopCode, a.ServiceNo) ? 1 : 0;
      const bPinned = isServicePinned(busStopCode, b.ServiceNo) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return a.ServiceNo.localeCompare(b.ServiceNo, undefined, { numeric: true });
    });
  }, [services, serviceQuery, filterMode, busStopCode, isServicePinned]);

  const lastUpdatedLabel = data?.FetchedAt
    ? new Date(data.FetchedAt).toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '--:--:--';

  function startNicknameEdit() {
    setNicknameDraft(favouriteEntry?.nickname ?? '');
    setEditingNickname(true);
  }

  function saveNickname() {
    onUpdateStopNickname(busStopCode, nicknameDraft);
    setEditingNickname(false);
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <section className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#E5E7EB] animate-pulse">
          <div className="h-6 w-48 bg-[#E5E7EB] rounded mb-2" />
          <div className="h-4 w-64 bg-[#F3F4F6] rounded" />
        </div>
        <div className="divide-y divide-[#F3F4F6]">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-16 bg-[#E5E7EB] rounded-lg" />
                <div>
                  <div className="h-4 w-36 bg-[#E5E7EB] rounded mb-2" />
                  <div className="h-3 w-24 bg-[#F3F4F6] rounded" />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="h-10 w-20 bg-[#F3F4F6] rounded" />
                <div className="h-10 w-20 bg-[#F3F4F6] rounded hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="bg-white border border-[#E2E5EA] rounded-xl p-8 text-center">
        <h2 className="font-display text-lg font-semibold text-[#111827]">
          Unable to load bus arrivals
        </h2>
        <p className="mt-2 text-sm text-[#6B7280] max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </section>
    );
  }

  // Unknown stop code (not in offline dataset)
  if (!stopInfo) {
    return (
      <section className="bg-white border border-[#E2E5EA] rounded-xl p-8">
        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded bg-[#111827] text-white">
            {busStopCode}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-[#111827]">
            Stop {busStopCode} is not in the offline directory
          </h2>
          <p className="mt-2 text-sm text-[#6B7280] leading-relaxed">
            This frontend preview includes major Singapore stops across Central, East, West,
            North, and North-East regions. Once your LTA DataMall API proxy is connected,
            all 5,000+ islandwide stops will resolve live.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/^\d{5}$/.test(busStopCode) && (
              <button
                type="button"
                onClick={onSimulateCustomStop}
                className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 bg-[#C81E1E] hover:bg-[#B91C1C] text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Preview Sample Timings for {busStopCode}
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectStop('09048')}
              className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              View 09048 · Lucky Plaza
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={`Bus arrivals for ${stopInfo.Description}`}
      className="bg-white border border-[#E2E5EA] rounded-xl overflow-hidden"
    >
      {/* Stop Header */}
      <div className="p-5 sm:p-6 border-b border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="font-mono text-base sm:text-lg font-bold tabular-nums px-3 py-2 rounded-lg bg-[#111827] text-white shrink-0 tracking-tight"
              title="5-digit LTA Bus Stop Code"
            >
              {stopInfo.BusStopCode}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                  {stopInfo.Description}
                </h1>
                {favouriteEntry?.nickname && (
                  <span className="text-sm font-medium text-[#C81E1E]">
                    ({favouriteEntry.nickname})
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[#6B7280]">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  {stopInfo.RoadName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{stopInfo.Region}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{services.length} services</span>
              </div>

              {/* Inline nickname editor when stop is saved */}
              {isStopFavourited && (
                <div className="mt-2.5">
                  {editingNickname ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveNickname();
                      }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="text"
                        value={nicknameDraft}
                        onChange={(e) => setNicknameDraft(e.target.value)}
                        placeholder="e.g. Home, Work, MRT"
                        maxLength={24}
                        autoFocus
                        className="h-9 px-3 text-xs bg-[#F9FAFB] border border-[#D1D5DB] rounded-md text-[#111827] focus:outline-none focus:border-[#C81E1E]"
                      />
                      <button
                        type="submit"
                        className="h-9 px-3 text-xs font-semibold bg-[#111827] text-white rounded-md hover:bg-[#1F2937]"
                      >
                        Save Label
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNickname(false)}
                        className="h-9 px-2.5 text-xs font-medium text-[#6B7280] hover:text-[#111827]"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={startNicknameEdit}
                      className="text-xs font-medium text-[#4B5563] hover:text-[#111827] underline underline-offset-2"
                    >
                      {favouriteEntry?.nickname
                        ? `Edit label "${favouriteEntry.nickname}"`
                        : 'Add label (e.g. Home, Office)'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Favourite Stop Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFavouriteStop(stopInfo)}
              aria-pressed={isStopFavourited}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] ${
                isStopFavourited
                  ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C] hover:bg-[#FEE2E2]'
                  : 'bg-white border-[#D1D5DB] text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              <Star
                className={`w-4 h-4 ${
                  isStopFavourited ? 'fill-[#C81E1E] text-[#C81E1E]' : 'text-[#6B7280]'
                }`}
                aria-hidden="true"
              />
              <span>{isStopFavourited ? 'Saved Stop' : 'Save Stop'}</span>
            </button>
          </div>
        </div>

        {/* Live status + Filter toolbar */}
        <div className="mt-5 pt-4 border-t border-[#F3F4F6] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter bus services"
              className="inline-flex items-center p-1 bg-[#F3F4F6] rounded-lg"
            >
              {(
                [
                  { id: 'all', label: 'All Services' },
                  { id: 'pinned', label: 'Pinned' },
                  { id: 'wab', label: 'Wheelchair' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`min-h-[34px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filterMode === tab.id
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Filter service no."
                aria-label="Filter bus service number"
                className="h-[40px] w-40 pl-8 pr-3 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#C81E1E]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6B7280]">
            <span className="tabular-nums">
              Updated {lastUpdatedLabel} ·{' '}
              {data?.Source === 'live-api'
                ? 'Live LTA DataMall v3'
                : 'Simulated Feed (set LTA_ACCOUNT_KEY for live data)'}
            </span>
            <button
              type="button"
              onClick={onToggleAutoRefresh}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#374151] font-medium transition-colors whitespace-nowrap"
            >
              {autoRefresh ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Auto-refresh On</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Auto-refresh Paused</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers (Desktop) */}
      {sortedAndFilteredServices.length > 0 && (
        <div className="hidden sm:grid sm:grid-cols-[1fr_auto] items-center px-6 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-medium text-[#6B7280]">
          <div>Service & Destination</div>
          <div className="flex items-center gap-6 pr-8 text-right">
            <span className="min-w-[104px]">Next Bus</span>
            <span className="min-w-[104px]">2nd Bus</span>
            <span className="min-w-[104px] hidden md:block">3rd Bus</span>
          </div>
        </div>
      )}

      {/* Services List */}
      {sortedAndFilteredServices.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-[#111827]">
            No bus services match your current filter.
          </p>
          <p className="mt-1 text-xs text-[#6B7280]">
            Clear the service search or switch back to All Services.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setServiceQuery('');
            }}
            className="mt-4 inline-flex items-center min-h-[40px] px-4 py-2 text-xs font-semibold bg-[#111827] text-white rounded-lg hover:bg-[#1F2937]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#E5E7EB]">
          {sortedAndFilteredServices.map((svc) => {
            const pinned = isServicePinned(busStopCode, svc.ServiceNo);
            const isExpanded = expandedService === svc.ServiceNo;
            const showingJson = showJsonFor === svc.ServiceNo;

            return (
              <li key={svc.ServiceNo} className="bg-white">
                <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFB] transition-colors">
                  {/* Left: Pin + Service Plate + Destination */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        onTogglePinnedService(
                          busStopCode,
                          stopInfo.Description,
                          svc.ServiceNo,
                          svc.DestinationName
                        )
                      }
                      aria-label={
                        pinned
                          ? `Unpin service ${svc.ServiceNo}`
                          : `Pin service ${svc.ServiceNo}`
                      }
                      aria-pressed={pinned}
                      className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E]"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          pinned
                            ? 'fill-[#C81E1E] text-[#C81E1E]'
                            : 'text-[#9CA3AF] hover:text-[#4B5563]'
                        }`}
                      />
                    </button>

                    <div className="min-w-[68px] px-2.5 py-2 rounded-lg bg-[#111827] text-white text-center font-mono text-base sm:text-lg font-bold tabular-nums tracking-tight shrink-0">
                      {svc.ServiceNo}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-[#111827] truncate">
                        To {svc.DestinationName}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B7280]">
                        <span>{svc.Operator}</span>
                        {svc.FrequencyMinutes > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">
                              Every {svc.FrequencyMinutes} min
                            </span>
                          </>
                        )}
                        {svc.NextBus.Feature === 'WAB' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className="inline-flex items-center gap-1 text-[#374151]"
                              title="Wheelchair Accessible Bus"
                            >
                              <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>WAB</span>
                            </span>
                          </>
                        )}
                        {pinned && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[#C81E1E]">Pinned</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Next 3 Arrivals + Expand Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pl-10 sm:pl-0">
                    <div className="flex items-start gap-5 sm:gap-6">
                      <BusSlotCell slot={svc.NextBus} isPrimary nowMs={nowMs} />
                      <BusSlotCell slot={svc.NextBus2} isPrimary={false} nowMs={nowMs} />
                      <div className="hidden md:block">
                        <BusSlotCell slot={svc.NextBus3} isPrimary={false} nowMs={nowMs} />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedService(isExpanded ? null : svc.ServiceNo)
                      }
                      aria-expanded={isExpanded}
                      aria-label={`Toggle details for service ${svc.ServiceNo}`}
                      className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Route & API Details */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        {svc.RouteHighlights.length > 0 ? (
                          <>
                            <div className="text-xs font-semibold text-[#374151] mb-1.5">
                              Key Stops Along Route
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4B5563]">
                              {svc.RouteHighlights.map((stopName, i) => (
                                <span key={stopName} className="inline-flex items-center gap-2">
                                  <span
                                    className={
                                      i === 0 ? 'font-semibold text-[#111827]' : ''
                                    }
                                  >
                                    {stopName}
                                  </span>
                                  {i < svc.RouteHighlights.length - 1 && (
                                    <span aria-hidden="true" className="text-[#9CA3AF]">
                                      →
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-[#4B5563]">
                            Origin Stop:{' '}
                            <span className="font-mono font-medium text-[#111827] tabular-nums">
                              {svc.NextBus.OriginCode || '—'}
                            </span>{' '}
                            · Destination Stop:{' '}
                            <span className="font-mono font-medium text-[#111827] tabular-nums">
                              {svc.NextBus.DestinationCode || '—'}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setShowJsonFor(showingJson ? null : svc.ServiceNo)
                        }
                        className="inline-flex items-center gap-1.5 self-start sm:self-center min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#374151] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F3F4F6] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{showingJson ? 'Hide API Schema' : 'Inspect API Schema'}</span>
                      </button>
                    </div>

                    {/* 3rd bus on smaller viewports where 3rd column was hidden */}
                    <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#4B5563] md:hidden">
                      <span>
                        3rd Bus:{' '}
                        <strong className="font-mono tabular-nums text-[#111827]">
                          {formatArrivalLabel(
                            getMinutesUntil(svc.NextBus3.EstimatedArrival, nowMs)
                          )}{' '}
                          min
                        </strong>{' '}
                        ({formatClockTime(svc.NextBus3.EstimatedArrival)} ·{' '}
                        {getLoadMeta(svc.NextBus3.Load).label} ·{' '}
                        {getBusTypeLabel(svc.NextBus3.Type)})
                      </span>
                    </div>

                    {showingJson && (
                      <pre className="mt-3 p-3.5 bg-[#111827] text-[#E5E7EB] rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
                        {JSON.stringify(
                          {
                            ServiceNo: svc.ServiceNo,
                            Operator: svc.Operator,
                            NextBus: svc.NextBus,
                            NextBus2: svc.NextBus2,
                            NextBus3: svc.NextBus3,
                          },
                          null,
                          2
                        )}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
