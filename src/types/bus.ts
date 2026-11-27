export type BusOperator = 'SBST' | 'SMRT' | 'TTS' | 'GAS';

export type BusLoad = 'SEA' | 'SDA' | 'LSD' | '';

export type BusFeature = 'WAB' | '';

export type BusType = 'SD' | 'DD' | 'BD' | '';

export type SingaporeRegion =
  | 'Central'
  | 'East'
  | 'West'
  | 'North'
  | 'North-East';

export interface NextBusSlot {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string; // ISO 8601 timestamp
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: BusLoad;
  Feature: BusFeature;
  Type: BusType;
}

export interface BusServiceArrival {
  ServiceNo: string;
  Operator: BusOperator;
  DestinationName: string;
  FrequencyMinutes: number;
  RouteHighlights: string[];
  NextBus: NextBusSlot;
  NextBus2: NextBusSlot;
  NextBus3: NextBusSlot;
}

export interface BusStopServiceMeta {
  serviceNo: string;
  operator: BusOperator;
  destination: string;
  destinationCode: string;
  originCode: string;
  frequencyMinutes: number;
  typicalType: BusType;
  wheelchairAccessible: boolean;
  routeHighlights: string[];
}

export interface BusStopRecord {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Region: SingaporeRegion;
  Latitude: number;
  Longitude: number;
  Services: BusStopServiceMeta[];
}

export interface BusArrivalResponse {
  BusStopCode: string;
  StopInfo: BusStopRecord | null;
  Services: BusServiceArrival[];
  FetchedAt: string;
  Source: 'simulated' | 'live-api';
}

export interface FavouriteStop {
  busStopCode: string;
  description: string;
  roadName: string;
  nickname: string;
  savedAt: string;
}

export interface PinnedService {
  busStopCode: string;
  stopDescription: string;
  serviceNo: string;
  destination: string;
  pinnedAt: string;
}

export type AppView = 'arrivals' | 'favourites' | 'directory';
