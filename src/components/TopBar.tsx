import { RefreshCw } from 'lucide-react';
import { AppView } from '../types/bus';

interface TopBarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  favouritesCount: number;
}

export function TopBar({
  activeView,
  onChangeView,
  onRefresh,
  isRefreshing,
  favouritesCount,
}: TopBarProps) {
  return (
    <header className="bg-white border-b border-[#E2E5EA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onChangeView('arrivals')}
          className="font-display text-lg font-bold tracking-tight text-[#111827] hover:text-[#C81E1E] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] focus-visible:ring-offset-2 rounded"
        >
          SG BusTime
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="flex items-center gap-5 sm:gap-7 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => onChangeView('arrivals')}
            className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] rounded-sm ${
              activeView === 'arrivals'
                ? 'text-[#111827]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Arrivals
            {activeView === 'arrivals' && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C81E1E]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeView('favourites')}
            className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] rounded-sm ${
              activeView === 'favourites'
                ? 'text-[#111827]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Favourites ({favouritesCount})
            {activeView === 'favourites' && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C81E1E]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => onChangeView('directory')}
            className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] rounded-sm ${
              activeView === 'directory'
                ? 'text-[#111827]'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Stop Directory
            {activeView === 'directory' && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C81E1E]"
              />
            )}
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#111827] hover:bg-[#1F2937] active:scale-[0.98] disabled:opacity-60 rounded-lg transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] focus-visible:ring-offset-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Refresh Timings</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
}
