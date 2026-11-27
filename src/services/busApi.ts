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

export const API_CONFIG = {
  healthEndpoint: '/api/health',
  busArrivalEndpoint: '/api/busarrival',
};

export interface ApiHealthStatus {
  ok: boolean;
  ltaKeyConfigured: boolean;
  refreshIntervalSeconds: number;
}

const KNOWN_DESTINATIONS: Record<string, string> = {
  '02089': 'Marina Centre Ter',
  '02099': 'Marina Centre Ter',
  '03218': 'Shenton Way Ter',
  '03239': 'Shenton Way Ter',
  '05009': 'New Bridge Rd Ter',
  '10009': 'Bukit Merah Int',
  '11009': 'Ghim Moh Ter',
  '11379': 'Buona Vista Ter',
  '14009': 'HarbourFront Int',
  '16169': 'Kent Ridge Ter',
  '17009': 'Clementi Int',
  '22009': 'Boon Lay Int',
  '28009': 'Jurong East Int',
  '43009': 'Bukit Batok Int',
  '44009': 'Choa Chu Kang Int',
  '45009': 'Bukit Panjang Int',
  '46009': 'Woodlands Int',
  '52009': 'Toa Payoh Int',
  '53009': 'Bishan Int',
  '54009': 'Ang Mo Kio Int',
  '55009': 'Yio Chu Kang Int',
  '59009': 'Yishun Int',
  '64009': 'Hougang Ctrl Int',
  '65009': 'Punggol Int',
  '66009': 'Serangoon Int',
  '67009': 'Sengkang Int',
  '68009': 'Hougang Ctrl Int',
  '75009': 'Tampines Int',
  '77009': 'Pasir Ris Int',
  '80009': 'Geylang Lor 1 Ter',
  '82009': 'Eunos Int',
  '84009': 'Bedok Int',
  '94009': 'Upper East Coast Ter',
  '95129': 'Changi Airport PTB2',
  '99009': 'Changi Village Ter',
};

const LOADS: BusLoad[] = ['SEA', 'SEA', 'SDA', 'LSD'];

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

function emptySlot(): NextBusSlot {
  return {
    OriginCode: '',
    DestinationCode: '',
    EstimatedArrival: '',
    Latitude: '',
    Longitude: '',
    VisitNumber: '',
    Load: '',
    Feature: '',
    Type: '',
  };
}

function normalizeLiveSlot(raw: Partial<NextBusSlot> | undefined): NextBusSlot {
  if (!raw) return emptySlot();
  return {
    OriginCode: raw.OriginCode ?? '',
    DestinationCode: raw.DestinationCode ?? '',
    EstimatedArrival: raw.EstimatedArrival ?? '',
    Latitude: raw.Latitude ?? '',
    Longitude: raw.Longitude ?? '',
    VisitNumber: raw.VisitNumber ?? '',
    Load: (raw.Load as BusLoad) ?? '',
    Feature: (raw.Feature as 'WAB' | '') ?? '',
    Type: (raw.Type as BusType) ?? '',
  };
}

interface RawLtaService {
  ServiceNo?: string;
  Operator?: BusOperator;
  NextBus?: Partial<NextBusSlot>;
  NextBus2?: Partial<NextBusSlot>;
  NextBus3?: Partial<NextBusSlot>;
}

function mapLiveServices(
  rawServices: RawLtaService[],
  catalogStop: BusStopRecord | null
): BusServiceArrival[] {
  return rawServices.map((raw) => {
    const serviceNo = raw.ServiceNo ?? '';
    const catalogMeta = catalogStop?.Services.find(
      (s) => s.serviceNo === serviceNo
    );
    const nextBus = normalizeLiveSlot(raw.NextBus);
    const destCode = nextBus.DestinationCode;
    const destinationName =
      catalogMeta?.destination ||
      (destCode ? KNOWN_DESTINATIONS[destCode] || `Terminal ${destCode}` : 'Terminus');

    return {
      ServiceNo: serviceNo,
      Operator: raw.Operator ?? catalogMeta?.operator ?? 'SBST',
      DestinationName: destinationName,
      FrequencyMinutes: catalogMeta?.frequencyMinutes ?? 0,
      RouteHighlights: catalogMeta?.routeHighlights ?? [],
      NextBus: nextBus,
      NextBus2: normalizeLiveSlot(raw.NextBus2),
      NextBus3: normalizeLiveSlot(raw.NextBus3),
    };
  });
}

export async function checkApiHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await fetch(API_CONFIG.healthEndpoint);
    if (!res.ok) {
      return { ok: false, ltaKeyConfigured: false, refreshIntervalSeconds: 20 };
    }
    const body = await res.json();
    return {
      ok: Boolean(body.ok),
      ltaKeyConfigured: Boolean(body.ltaKeyConfigured),
      refreshIntervalSeconds: Number(body.refreshIntervalSeconds) || 20,
    };
  } catch {
    return { ok: false, ltaKeyConfigured: false, refreshIntervalSeconds: 20 };
  }
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
    const matchesService = stop.Services.some(
      (svc) => svc.serviceNo.toLowerCase() === q
    );
    return matchesCode || matchesDesc || matchesRoad || matchesRegion || matchesService;
  });
}

export async function fetchBusArrival(
  busStopCode: string,
  options?: {
    serviceNo?: string;
    simulateCustomStop?: boolean;
    refreshNonce?: number;
  }
): Promise<BusArrivalResponse> {
  const cleanedCode = busStopCode.trim();
  const catalogStop = getBusStopByCode(cleanedCode);

  if (/^\d{5}$/.test(cleanedCode)) {
    try {
      const params = new URLSearchParams({ BusStopCode: cleanedCode });
      if (options?.serviceNo?.trim()) {
        params.set('ServiceNo', options.serviceNo.trim());
      }

      const res = await fetch(
        `${API_CONFIG.busArrivalEndpoint}?${params.toString()}`
      );
      const body = await res.json().catch(() => ({}));

      if (res.ok) {
        const rawServices: RawLtaService[] = Array.isArray(body.Services)
          ? body.Services
          : [];
        const liveServices = mapLiveServices(rawServices, catalogStop);

        const stopInfo: BusStopRecord | null =
          catalogStop ??
          (liveServices.length > 0
            ? {
                BusStopCode: cleanedCode,
                RoadName: 'Live LTA DataMall Stop',
                Description: `Bus Stop ${cleanedCode}`,
                Region: 'Central',
                Latitude: Number(liveServices[0]?.NextBus.Latitude) || 1.3521,
                Longitude: Number(liveServices[0]?.NextBus.Longitude) || 103.8198,
                Services: liveServices.map((s) => ({
                  serviceNo: s.ServiceNo,
                  operator: s.Operator,
                  destination: s.DestinationName,
                  destinationCode: s.NextBus.DestinationCode,
                  originCode: s.NextBus.OriginCode,
                  frequencyMinutes: s.FrequencyMinutes,
                  typicalType: s.NextBus.Type || 'SD',
                  wheelchairAccessible: s.NextBus.Feature === 'WAB',
                  routeHighlights: s.RouteHighlights,
                })),
              }
            : null);

        return {
          BusStopCode: body.BusStopCode ?? cleanedCode,
          StopInfo: stopInfo,
          Services: liveServices,
          FetchedAt: body.FetchedAt ?? new Date().toISOString(),
          Source: 'live-api',
        };
      }

      // When server key is configured, surface real upstream/validation errors
      if (res.status !== 503 || body.configured === true) {
        throw new Error(
          body.error || `Bus arrival request failed (${res.status}).`
        );
      }
      // If 503 with configured: false (LTA_ACCOUNT_KEY not yet set), fall through to local simulation
    } catch (err) {
      // Only rethrow explicit API errors when backend was reached and configured
      if (
        err instanceof Error &&
        !err.message.includes('Failed to fetch') &&
        !err.message.includes('NetworkError') &&
        !err.message.includes('LTA_ACCOUNT_KEY')
      ) {
        throw err;
      }
    }
  }

  // Fallback simulated schedules while LTA_ACCOUNT_KEY is not yet configured
  await new Promise((resolve) => setTimeout(resolve, 140));
  const nonce = options?.refreshNonce ?? 0;

  if (catalogStop) {
    const services = synthesizeServicesForStop(
      catalogStop.BusStopCode,
      catalogStop.Services,
      catalogStop.Latitude,
      catalogStop.Longitude,
      nonce
    );
    const filtered = options?.serviceNo?.trim()
      ? services.filter(
          (s) => s.ServiceNo.toLowerCase() === options.serviceNo?.trim().toLowerCase()
        )
      : services;

    return {
      BusStopCode: catalogStop.BusStopCode,
      StopInfo: catalogStop,
      Services: filtered,
      FetchedAt: new Date().toISOString(),
      Source: 'simulated',
    };
  }

  if (options?.simulateCustomStop && /^\d{5}$/.test(cleanedCode)) {
    const previewServices: BusStopServiceMeta[] = [
      {
        serviceNo: '21',
        operator: 'SBST',
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
        operator: 'SBST',
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
        operator: 'SBST',
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
