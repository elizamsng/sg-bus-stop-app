import { ArrowRight, Search, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { searchBusStops } from '../services/busApi';
import { BusStopRecord } from '../types/bus';

interface SearchBarProps {
  activeCode: string;
  onSelectStop: (busStopCode: string) => void;
}

const SAMPLE_CODES = [
  { code: '09048', label: 'Lucky Plaza' },
  { code: '01113', label: 'Bugis Stn' },
  { code: '14141', label: 'VivoCity' },
  { code: '75009', label: 'Tampines Int' },
  { code: '28009', label: 'Jurong East' },
];

export function SearchBar({ activeCode, onSelectStop }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions: BusStopRecord[] = useMemo(() => {
    return searchBusStops(query).slice(0, 7);
  }, [query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function commitSelection(code: string) {
    setValidationMsg(null);
    setIsOpen(false);
    setQuery('');
    onSelectStop(code);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setValidationMsg('Enter a 5-digit bus stop code (e.g. 09048) or stop name.');
      inputRef.current?.focus();
      return;
    }

    // Exact 5-digit bus stop code lookup
    if (/^\d{5}$/.test(trimmed)) {
      commitSelection(trimmed);
      return;
    }

    // If user typed partial digits that aren't 5 digits and no suggestion matched
    if (/^\d+$/.test(trimmed) && suggestions.length === 0) {
      setValidationMsg('Singapore bus stop codes must be 5 digits (e.g. 09048).');
      return;
    }

    if (suggestions.length > 0) {
      const target = suggestions[highlightIndex] ?? suggestions[0];
      commitSelection(target.BusStopCode);
      return;
    }

    setValidationMsg('No matching bus stop found. Try a 5-digit code like 09048.');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        suggestions.length > 0 ? (prev + 1) % suggestions.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        suggestions.length > 0
          ? (prev - 1 + suggestions.length) % suggestions.length
          : 0
      );
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <section aria-label="Bus stop search" className="bg-white border border-[#E2E5EA] rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-3">
        <label
          htmlFor="bus-stop-search"
          className="font-display text-base font-semibold text-[#111827]"
        >
          Find Bus Stop by Code or Name
        </label>
        <span className="text-xs text-[#6B7280] tabular-nums">
          Enter any 5-digit LTA stop code
        </span>
      </div>

      <div ref={containerRef} className="relative">
        <form onSubmit={handleSubmit} className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              id="bus-stop-search"
              type="text"
              inputMode="search"
              autoComplete="off"
              value={query}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setValidationMsg(null);
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search stop code (e.g. 09048), road, or service 190..."
              aria-expanded={isOpen}
              aria-controls="bus-stop-suggestions"
              aria-autocomplete="list"
              className="w-full min-h-[44px] pl-10 pr-10 py-2.5 bg-[#F9FAFB] border border-[#D1D5DB] rounded-lg text-sm sm:text-base text-[#111827] placeholder:text-[#9CA3AF] focus:bg-white focus:outline-none focus:border-[#C81E1E] focus:ring-2 focus:ring-[#C81E1E]/15 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setValidationMsg(null);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-[#6B7280] hover:text-[#111827] rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#C81E1E] hover:bg-[#B91C1C] active:scale-[0.98] text-white text-sm font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E] focus-visible:ring-offset-2"
          >
            <span>Look Up</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {validationMsg && (
          <p role="alert" className="mt-2 text-xs font-medium text-[#B91C1C]">
            {validationMsg}
          </p>
        )}

        {/* Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <ul
            id="bus-stop-suggestions"
            role="listbox"
            className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-[#E2E5EA] rounded-xl shadow-lg overflow-hidden divide-y divide-[#F3F4F6] max-h-80 overflow-y-auto"
          >
            {suggestions.map((stop, idx) => {
              const isHighlighted = idx === highlightIndex;
              const isCurrent = stop.BusStopCode === activeCode;
              return (
                <li
                  key={stop.BusStopCode}
                  role="option"
                  aria-selected={isHighlighted}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onClick={() => commitSelection(stop.BusStopCode)}
                    className={`w-full text-left px-4 py-3 min-h-[48px] flex items-center justify-between gap-4 transition-colors ${
                      isHighlighted ? 'bg-[#F9FAFB]' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-semibold tabular-nums px-2 py-1 rounded bg-[#111827] text-white shrink-0">
                        {stop.BusStopCode}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#111827] truncate">
                          {stop.Description}
                        </div>
                        <div className="text-xs text-[#6B7280] truncate">
                          {stop.RoadName} · {stop.Region} · {stop.Services.length} services
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#6B7280] shrink-0">
                      {isCurrent ? 'Viewing' : 'Select'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick access codes */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#6B7280]">
        <span className="font-medium text-[#4B5563]">Quick lookup:</span>
        {SAMPLE_CODES.map((item) => {
          const selected = activeCode === item.code;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => commitSelection(item.code)}
              className={`inline-flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:underline ${
                selected
                  ? 'text-[#C81E1E] font-semibold'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              <span className="font-mono tabular-nums">{item.code}</span>
              <span aria-hidden="true">·</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
