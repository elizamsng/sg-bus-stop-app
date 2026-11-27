export interface ServerlessRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

export interface ServerlessResponse {
  status(code: number): ServerlessResponse;
  setHeader(name: string, value: string): ServerlessResponse | void;
  json(body: unknown): void;
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const hasAccountKey = Boolean(process.env.LTA_ACCOUNT_KEY?.trim());

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'sg-bustime-api',
    ltaKeyConfigured: hasAccountKey,
    upstreamEndpoint:
      'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival',
    refreshIntervalSeconds: 20,
    timestamp: new Date().toISOString(),
  });
}
