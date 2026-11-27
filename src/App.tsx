import { useCallback, useEffect, useState } from 'react';
import { ArrivalBoard } from './components/ArrivalBoard';
import { DirectoryView } from './components/DirectoryView';
import { FavouritesRail } from './components/FavouritesRail';
import { FavouritesView } from './components/FavouritesView';
import { SearchBar } from './components/SearchBar';
import { TopBar } from './components/TopBar';
import { useFavourites } from './hooks/useFavourites';
import { fetchBusArrival } from './services/busApi';
import { AppView, BusArrivalResponse } from './types/bus';

export default function App() {
  const {
    favouriteStops,
    pinnedServices,
    recentStopCodes,
    isStopFavourited,
    toggleFavouriteStop,
    updateStopNickname,
    removeFavouriteStop,
    isServicePinned,
    togglePinnedService,
    recordRecentStop,
  } = useFavourites();

  const [activeView, setActiveView] = useState<AppView>('arrivals');
  const [activeStopCode, setActiveStopCode] = useState<string>(() => {
    return favouriteStops[0]?.busStopCode ?? '09048';
  });
  const [simulateCustomStop, setSimulateCustomStop] = useState(false);
  const [arrivalData, setArrivalData] = useState<BusArrivalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadStopArrivals = useCallback(
    async (code: string, customPreview: boolean, nonce: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchBusArrival(code, {
          simulateCustomStop: customPreview,
          refreshNonce: nonce,
        });
        setArrivalData(res);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load bus arrival timings.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStopArrivals(activeStopCode, simulateCustomStop, refreshNonce);
  }, [activeStopCode, simulateCustomStop, refreshNonce, loadStopArrivals]);

  // Live countdown ticker every 15 seconds
  useEffect(() => {
    const ticker = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15000);
    return () => window.clearInterval(ticker);
  }, []);

  // Periodic data refresh every 20 seconds matching LTA DataMall v3 cadence
  useEffect(() => {
    if (!autoRefresh) return;
    const poller = window.setInterval(() => {
      setNowMs(Date.now());
      setRefreshNonce((n) => n + 1);
    }, 20000);
    return () => window.clearInterval(poller);
  }, [autoRefresh]);

  function handleSelectStop(code: string) {
    const cleaned = code.trim();
    if (!cleaned) return;
    setSimulateCustomStop(false);
    setActiveStopCode(cleaned);
    recordRecentStop(cleaned);
    setActiveView('arrivals');
  }

  function handleManualRefresh() {
    setNowMs(Date.now());
    setRefreshNonce((n) => n + 1);
  }

  const activeFavouriteEntry = favouriteStops.find(
    (f) => f.busStopCode === activeStopCode
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F6F8] text-[#111827]">
      <TopBar
        activeView={activeView}
        onChangeView={setActiveView}
        onRefresh={handleManualRefresh}
        isRefreshing={isLoading}
        favouritesCount={favouriteStops.length}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeView === 'arrivals' && (
          <div className="space-y-6">
            <SearchBar
              activeCode={activeStopCode}
              onSelectStop={handleSelectStop}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
              <div className="order-2 lg:order-1">
                <FavouritesRail
                  activeCode={activeStopCode}
                  favouriteStops={favouriteStops}
                  pinnedServices={pinnedServices}
                  recentStopCodes={recentStopCodes}
                  onSelectStop={handleSelectStop}
                  onOpenFavouritesView={() => setActiveView('favourites')}
                />
              </div>

              <div className="order-1 lg:order-2 min-w-0">
                <ArrivalBoard
                  busStopCode={activeStopCode}
                  data={arrivalData}
                  isLoading={isLoading}
                  error={error}
                  nowMs={nowMs}
                  autoRefresh={autoRefresh}
                  onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
                  onRefresh={handleManualRefresh}
                  onSimulateCustomStop={() => setSimulateCustomStop(true)}
                  onSelectStop={handleSelectStop}
                  isStopFavourited={isStopFavourited(activeStopCode)}
                  favouriteEntry={activeFavouriteEntry}
                  onToggleFavouriteStop={(stop) => toggleFavouriteStop(stop)}
                  onUpdateStopNickname={updateStopNickname}
                  isServicePinned={isServicePinned}
                  onTogglePinnedService={togglePinnedService}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'favourites' && (
          <FavouritesView
            favouriteStops={favouriteStops}
            pinnedServices={pinnedServices}
            nowMs={nowMs}
            refreshNonce={refreshNonce}
            onSelectStop={handleSelectStop}
            onRemoveFavouriteStop={removeFavouriteStop}
            onUpdateStopNickname={updateStopNickname}
            onUnpinService={togglePinnedService}
            onBrowseDirectory={() => setActiveView('directory')}
          />
        )}

        {activeView === 'directory' && (
          <DirectoryView
            onSelectStop={handleSelectStop}
            isStopFavourited={isStopFavourited}
            onToggleFavouriteStop={(stop) => toggleFavouriteStop(stop)}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E5EA] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B7280]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Load: Seats · Standing · Limited</span>
            <span aria-hidden="true">/</span>
            <span>Bus Types: SD Single · DD Double · BD Bendy · WAB Wheelchair</span>
          </div>
          <div>
            Frontend preview using simulated schedules · API adapter in{' '}
            <code className="font-mono text-[#374151]">src/services/busApi.ts</code>
          </div>
        </div>
      </footer>
    </div>
  );
}
