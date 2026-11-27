import { SINGAPORE_BUS_STOPS } from '../data/singaporeStops';
import {
  BusArrivalResponse,
  BusLoad,
  BusOperator,
  BusServiceArrival,
  BusStopRecord,
  BusStopServiceMeta,
  BusType,
  NextBusSlot,
} from '../types/bus';

/**
 * Frontend API Adapter Layer
 * --------------------------
 * Ready to connect to a backend proxy for LTA DataMall Bus Arrival v2:
 * GET https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=XXXXX
 *
 * When establishing the real API connection later:
 * 1. Set API_CONFIG.useLiveApi = true (or drive via import.meta.env.VITE_USE_LIVE_BUS_API)
 * 2. Point API_CONFIG.baseUrl to your backend proxy route (e.g. '/api/bus-arrival')
 *    so the LTA AccountKey stays securely on the server.
 */
export const API_CONFIG = {
  useLiveApi: false,
  baseUrl: '/api/bus-arrival',
};

const LOADS: BusLoad[] = ['SEA', 'SEA', 'SDA', 'LSD'];

// Deterministic pseudo-random generator seeded by stop + service + time bucket
function seededValue(seedStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function buildNextBusSlot(
  meta: BusStopServiceMeta,
  minutesFromNow: number,
  visitNumber: string,
  seedSuffix: string,
  stopLat: number,
  stopLng: number
): NextBusSlot {
  const arrivalDate = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const loadRoll = seededValue(`${meta.originCode}-${meta.serviceNo}-${seedSuffix}`);
  const load: BusLoad =
    minutesFromNow <= 2
      ? loadRoll > 0.45
        ? 'SDA'
        : 'SEA'
      : LOADS[Math.floor(loadRoll * LOADS.length)];

  const typeRoll = seededValue(`type-${meta.serviceNo}-${seedSuffix}`);
  const busType: BusType =
    typeRoll > 0.72 ? 'SD' : meta.typicalType || 'DD';

  return {
    OriginCode: meta.originCode,
    DestinationCode: meta.destinationCode,
    EstimatedArrival: arrivalDate.toISOString(),
    Latitude: (stopLat + (loadRoll - 0.5) * 0.015).toFixed(6),
    Longitude: (stopLng + (typeRoll - 0.5) * 0.015).toFixed(6),
    VisitNumber: visitNumber,
    Load: load,
    Feature: meta.wheelchairAccessible ? 'WAB' : '',
    Type: busType,
  };
}

function synthesizeServicesForStop(
  stopCode: string,
  services: BusStopServiceMeta[],
  lat: number,
  lng: number,
  cycleOffset = 0
): BusServiceArrival[] {
  // Minute-based bucket shifts naturally over time, plus manual refresh jitter
  const timeBucket = Math.floor(Date.now() / 60000) + cycleOffset;

  return services.map((meta) => {
    const r1 = seededValue(`${stopCode}-${meta.serviceNo}-${timeBucket}-1`);
    const r2 = seededValue(`${stopCode}-${meta.serviceNo}-${timeBucket}-2`);
    const r3 = seededValue(`${stopCode}-${meta.serviceNo}-${timeBucket}-3`);

    const firstMin = Math.max(0, Math.round(r1 * Math.min(meta.frequencyMinutes, 10)));
    const secondMin = firstMin + Math.max(4, Math.round(meta.frequencyMinutes * (0.75 + r2 * 0.5)));
    const thirdMin = secondMin + Math.max(5, Math.round(meta.frequencyMinutes * (0.8 + r3 * 0.5)));

    return {
      ServiceNo: meta.serviceNo,
      Operator: meta.operator,
      DestinationName: meta.destination,
      FrequencyMinutes: meta.frequencyMinutes,
      RouteHighlights: meta.routeHighlights,
      NextBus: buildNextBusSlot(meta, firstMin, '1', `${timeBucket}-1`, lat, lng),
      NextBus2: buildNextBusSlot(meta, secondMin, '1', `${timeBucket}-2`, lat, lng),
      NextBus3: buildNextBusSlot(meta, thirdMin, '1', `${timeBucket}-3`, lat, lng),
    };
  });
}

export function getAllBusStops(): BusStopRecord[] {
  return SINGAPORE_BUS_STOPS;
}

export function getBusStopByCode(busStopCode: string): BusStopRecord | null {
  const cleaned = busStopCode.trim();
  return SINGAPORE_BUS_STOPS.find((s) => s.BusStopCode === cleaned) ?? null;
}

export function searchBusStops(query: string): BusStopRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return SINGAPORE_BUS_STOPS;

  return SINGAPORE_BUS_STOPS.filter((stop) => {
    const matchesCode = stop.BusStopCode.toLowerCase().includes(q);
    const matchesDesc = stop.Description.toLowerCase().includes(q);
    const matchesRoad = stop.RoadName.toLowerCase().includes(q);
    const matchesRegion = stop.Region.toLowerCase().includes(q);
    const matchesService = stop.Services.some((svc) =>
      svc.serviceNo.toLowerCase() === q
    );
    return matchesCode || matchesDesc || matchesRoad || matchesRegion || matchesService;
  });
}

export async function fetchBusArrival(
  busStopCode: string,
  options?: { simulateCustomStop?: boolean; refreshNonce?: number }
): Promise<BusArrivalResponse> {
  const cleanedCode = busStopCode.trim();

  if (API_CONFIG.useLiveApi) {
    const res = await fetch(
      `${API_CONFIG.baseUrl}?BusStopCode=${encodeURIComponent(cleanedCode)}`
    );
    if (!res.ok) {
      throw new Error(`Bus arrival request failed (${res.status})`);
    }
    const payload = await res.json();
    return {
      BusStopCode: cleanedCode,
      StopInfo: getBusStopByCode(cleanedCode),
      Services: payload.Services ?? [],
      FetchedAt: new Date().toISOString(),
      Source: 'live-api',
    };
  }

  // Simulated frontend latency (fast, responsive 160ms)
  await new Promise((resolve) => setTimeout(resolve, 160));

  const stop = getBusStopByCode(cleanedCode);
  const nonce = options?.refreshNonce ?? 0;

  if (stop) {
    return {
      BusStopCode: stop.BusStopCode,
      StopInfo: stop,
      Services: synthesizeServicesForStop(
        stop.BusStopCode,
        stop.Services,
        stop.Latitude,
        stop.Longitude,
        nonce
      ),
      FetchedAt: new Date().toISOString(),
      Source: 'simulated',
    };
  }

  // Optional preview generator for valid 5-digit codes not in the offline catalog
  if (options?.simulateCustomStop && /^\d{5}$/.test(cleanedCode)) {
    const previewServices: BusStopServiceMeta[] = [
      {
        serviceNo: '21',
        operator: 'SBST' as BusOperator,
        destination: 'Saint Michael Ter',
        destinationCode: '52009',
        originCode: cleanedCode,
        frequencyMinutes: 9,
        typicalType: 'DD',
        wheelchairAccessible: true,
        routeHighlights: [`Stop ${cleanedCode}`, 'Town Centre', 'MRT Interchange', 'Saint Michael Ter'],
      },
      {
        serviceNo: '85',
        operator: 'SBST' as BusOperator,
        destination: 'Punggol Int',
        destinationCode: '65009',
        originCode: cleanedCode,
        frequencyMinutes: 11,
        typicalType: 'SD',
        wheelchairAccessible: true,
        routeHighlights: [`Stop ${cleanedCode}`, 'Main Ave', 'Expressway Link', 'Punggol Int'],
      },
      {
        serviceNo: '168',
        operator: 'SBST' as BusOperator,
        destination: 'Bedok Int',
        destinationCode: '84009',
        originCode: cleanedCode,
        frequencyMinutes: 12,
        typicalType: 'DD',
        wheelchairAccessible: true,
        routeHighlights: [`Stop ${cleanedCode}`, 'Regional Hub', 'Bedok Int'],
      },
    ];

    const customStop: BusStopRecord = {
      BusStopCode: cleanedCode,
      RoadName: 'Preview Mode (Offline)',
      Description: `Bus Stop ${cleanedCode}`,
      Region: 'Central',
      Latitude: 1.3521,
      Longitude: 103.8198,
      Services: previewServices,
    };

    return {
      BusStopCode: cleanedCode,
      StopInfo: customStop,
      Services: synthesizeServicesForStop(
        cleanedCode,
        previewServices,
        customStop.Latitude,
        customStop.Longitude,
        nonce
      ),
      FetchedAt: new Date().toISOString(),
      Source: 'simulated',
    };
  }

  return {
    BusStopCode: cleanedCode,
    StopInfo: null,
    Services: [],
    FetchedAt: new Date().toISOString(),
    Source: 'simulated',
  };
}

export function getMinutesUntil(isoString: string, nowMs = Date.now()): number | null {
  if (!isoString) return null;
  const target = new Date(isoString).getTime();
  if (Number.isNaN(target)) return null;
  const diffMin = Math.floor((target - nowMs) / 60000);
  return Math.max(0, diffMin);
}

export function formatClockTime(isoString: string): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatArrivalLabel(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes <= 0) return 'Arr';
  return `${minutes}`;
}

export function getLoadMeta(load: BusLoad): {
  label: string;
  textClass: string;
  barClass: string;
} {
  switch (load) {
    case 'SEA':
      return {
        label: 'Seats',
        textClass: 'text-[#15803D]',
        barClass: 'bg-[#15803D]',
      };
    case 'SDA':
      return {
        label: 'Standing',
        textClass: 'text-[#B45309]',
        barClass: 'bg-[#B45309]',
      };
    case 'LSD':
      return {
        label: 'Limited',
        textClass: 'text-[#B91C1C]',
        barClass: 'bg-[#B91C1C]',
      };
    default:
      return {
        label: 'No data',
        textClass: 'text-[#6B7280]',
        barClass: 'bg-[#9CA3AF]',
      };
  }
}

export function getBusTypeLabel(busType: BusType): string {
  switch (busType) {
    case 'DD':
      return 'Double Deck';
    case 'BD':
      return 'Bendy';
    case 'SD':
      return 'Single Deck';
    default:
      return 'Standard';
  }
}
