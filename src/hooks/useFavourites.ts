import { useCallback, useEffect, useState } from 'react';
import { BusStopRecord, FavouriteStop, PinnedService } from '../types/bus';

const FAV_STOPS_KEY = 'sgbustime.favouriteStops.v1';
const PINNED_SERVICES_KEY = 'sgbustime.pinnedServices.v1';
const RECENT_STOPS_KEY = 'sgbustime.recentStops.v1';
const INITIALIZED_KEY = 'sgbustime.initialized.v1';

const DEFAULT_FAVOURITES: FavouriteStop[] = [
  {
    busStopCode: '09048',
    description: 'Lucky Plaza',
    roadName: 'Orchard Rd',
    nickname: 'Orchard',
    savedAt: new Date().toISOString(),
  },
  {
    busStopCode: '14141',
    description: 'HarbourFront Stn / VivoCity',
    roadName: 'Telok Blangah Rd',
    nickname: 'VivoCity',
    savedAt: new Date().toISOString(),
  },
];

const DEFAULT_PINNED_SERVICES: PinnedService[] = [
  {
    busStopCode: '09048',
    stopDescription: 'Lucky Plaza',
    serviceNo: '190',
    destination: 'Choa Chu Kang Int',
    pinnedAt: new Date().toISOString(),
  },
];

const DEFAULT_RECENTS: string[] = ['09048', '01113', '14141', '75009'];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useFavourites() {
  const [favouriteStops, setFavouriteStops] = useState<FavouriteStop[]>(() => {
    const hasInit = window.localStorage.getItem(INITIALIZED_KEY);
    if (!hasInit) {
      window.localStorage.setItem(INITIALIZED_KEY, '1');
      window.localStorage.setItem(FAV_STOPS_KEY, JSON.stringify(DEFAULT_FAVOURITES));
      return DEFAULT_FAVOURITES;
    }
    return readJson<FavouriteStop[]>(FAV_STOPS_KEY, []);
  });

  const [pinnedServices, setPinnedServices] = useState<PinnedService[]>(() => {
    const saved = window.localStorage.getItem(PINNED_SERVICES_KEY);
    if (saved === null) {
      window.localStorage.setItem(PINNED_SERVICES_KEY, JSON.stringify(DEFAULT_PINNED_SERVICES));
      return DEFAULT_PINNED_SERVICES;
    }
    return readJson<PinnedService[]>(PINNED_SERVICES_KEY, []);
  });

  const [recentStopCodes, setRecentStopCodes] = useState<string[]>(() => {
    return readJson<string[]>(RECENT_STOPS_KEY, DEFAULT_RECENTS);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(FAV_STOPS_KEY, JSON.stringify(favouriteStops));
    } catch {
      // ignore storage quota errors
    }
  }, [favouriteStops]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PINNED_SERVICES_KEY, JSON.stringify(pinnedServices));
    } catch {
      // ignore
    }
  }, [pinnedServices]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_STOPS_KEY, JSON.stringify(recentStopCodes));
    } catch {
      // ignore
    }
  }, [recentStopCodes]);

  const isStopFavourited = useCallback(
    (code: string) => favouriteStops.some((f) => f.busStopCode === code),
    [favouriteStops]
  );

  const toggleFavouriteStop = useCallback((stop: BusStopRecord, nickname = '') => {
    setFavouriteStops((prev) => {
      const exists = prev.some((f) => f.busStopCode === stop.BusStopCode);
      if (exists) {
        return prev.filter((f) => f.busStopCode !== stop.BusStopCode);
      }
      const next: FavouriteStop = {
        busStopCode: stop.BusStopCode,
        description: stop.Description,
        roadName: stop.RoadName,
        nickname: nickname.trim(),
        savedAt: new Date().toISOString(),
      };
      return [next, ...prev];
    });
  }, []);

  const updateStopNickname = useCallback((code: string, nickname: string) => {
    setFavouriteStops((prev) =>
      prev.map((f) =>
        f.busStopCode === code ? { ...f, nickname: nickname.trim() } : f
      )
    );
  }, []);

  const removeFavouriteStop = useCallback((code: string) => {
    setFavouriteStops((prev) => prev.filter((f) => f.busStopCode !== code));
  }, []);

  const isServicePinned = useCallback(
    (busStopCode: string, serviceNo: string) =>
      pinnedServices.some(
        (p) => p.busStopCode === busStopCode && p.serviceNo === serviceNo
      ),
    [pinnedServices]
  );

  const togglePinnedService = useCallback(
    (
      busStopCode: string,
      stopDescription: string,
      serviceNo: string,
      destination: string
    ) => {
      setPinnedServices((prev) => {
        const exists = prev.some(
          (p) => p.busStopCode === busStopCode && p.serviceNo === serviceNo
        );
        if (exists) {
          return prev.filter(
            (p) => !(p.busStopCode === busStopCode && p.serviceNo === serviceNo)
          );
        }
        return [
          {
            busStopCode,
            stopDescription,
            serviceNo,
            destination,
            pinnedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    },
    []
  );

  const recordRecentStop = useCallback((code: string) => {
    const cleaned = code.trim();
    if (!cleaned) return;
    setRecentStopCodes((prev) => {
      const filtered = prev.filter((c) => c !== cleaned);
      return [cleaned, ...filtered].slice(0, 6);
    });
  }, []);

  return {
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
  };
}
