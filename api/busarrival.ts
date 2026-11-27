interface ServerlessRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ServerlessResponse {
  status(code: number): ServerlessResponse;
  setHeader(name: string, value: string): ServerlessResponse | void;
  json(body: unknown): void;
}

const LTA_BUS_ARRIVAL_URL =
  'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

const BUS_STOP_CODE_PATTERN = /^\d{5}$/;
const SERVICE_NO_PATTERN = /^[A-Za-z0-9]{1,6}$/;

function getSingleQueryParam(
  query: ServerlessRequest['query'],
  key: string
): string {
  const raw = query?.[key];
  if (Array.isArray(raw)) {
    return (raw[0] ?? '').trim();
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse
): Promise<void> {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const busStopCode = getSingleQueryParam(req.query, 'BusStopCode');
  const serviceNo = getSingleQueryParam(req.query, 'ServiceNo');

  if (!BUS_STOP_CODE_PATTERN.test(busStopCode)) {
    res.status(400).json({
      error: 'BusStopCode must be a valid 5-digit code (e.g. 04121).',
    });
    return;
  }

  if (serviceNo && !SERVICE_NO_PATTERN.test(serviceNo)) {
    res.status(400).json({
      error: 'ServiceNo must be 1 to 6 alphanumeric characters (e.g. 7 or 410G).',
    });
    return;
  }

  const accountKey = process.env.LTA_ACCOUNT_KEY?.trim();
  if (!accountKey) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({
      configured: false,
      error: 'LTA_ACCOUNT_KEY is not configured on the server.',
    });
    return;
  }

  const upstreamParams = new URLSearchParams({
    BusStopCode: busStopCode,
  });
  if (serviceNo) {
    upstreamParams.set('ServiceNo', serviceNo);
  }

  const upstreamUrl = `${LTA_BUS_ARRIVAL_URL}?${upstreamParams.toString()}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstreamRes.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(upstreamRes.status === 401 || upstreamRes.status === 403 ? 502 : upstreamRes.status).json({
        configured: true,
        error: `LTA DataMall responded with HTTP ${upstreamRes.status}.`,
      });
      return;
    }

    const data = await upstreamRes.json();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      BusStopCode: data.BusStopCode ?? busStopCode,
      Services: Array.isArray(data.Services) ? data.Services : [],
      FetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    res.setHeader('Cache-Control', 'no-store');
    res.status(isTimeout ? 504 : 502).json({
      configured: true,
      error: isTimeout
        ? 'Timed out waiting for LTA DataMall BusArrival v3.'
        : 'Unable to reach LTA DataMall BusArrival v3.',
    });
  }
}
