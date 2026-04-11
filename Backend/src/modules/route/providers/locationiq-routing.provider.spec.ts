import {
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { RouteConstraintType } from '../enums/route-constraint-type.enum';
import { LocationIqRoutingProvider } from './locationiq-routing.provider';

describe('LocationIqRoutingProvider', () => {
  const originalLocationIqApiKey = process.env.LOCATIONIQ_API_KEY;
  const originalLocationalApiKey = process.env.LOCATIONAL_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.LOCATIONIQ_API_KEY = 'pk.test-locationiq-key';
    process.env.LOCATIONAL_API_KEY = '';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.LOCATIONIQ_API_KEY = originalLocationIqApiKey;
    process.env.LOCATIONAL_API_KEY = originalLocationalApiKey;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('retries with fewer alternatives after a TooBig response', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        text: async () => '{"code":"TooBig"}',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 4200,
              duration: 900,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [35, 32],
                  [35.01, 32.01],
                ],
              },
            },
          ],
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();
    const result = await provider.getRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      requestedConstraints: [RouteConstraintType.AVOID_INCIDENTS],
      alternativeRouteCount: 6,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('alternatives=6');
    expect(String(fetchMock.mock.calls[1][0])).toContain('alternatives=3');
    expect(result.geometry.coordinates).toEqual([
      [35, 32],
      [35.01, 32.01],
    ]);
  });

  it('throws when the provider still fails after retrying', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: false,
        text: async () => '{"code":"TooBig"}',
      });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();

    await expect(
      provider.getRoute({
        startLatitude: 32,
        startLongitude: 35,
        endLatitude: 32.02,
        endLongitude: 35.02,
        alternativeRouteCount: 3,
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('alternatives=3');
    expect(String(fetchMock.mock.calls[1][0])).toContain('alternatives=1');
  });

  it('reuses the same in-flight request for identical route inputs', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 4200,
            duration: 900,
            geometry: {
              type: 'LineString',
              coordinates: [
                [35, 32],
                [35.01, 32.01],
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();
    const request = {
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      requestedConstraints: [RouteConstraintType.AVOID_INCIDENTS],
      alternativeRouteCount: 6,
    };

    const [firstResult, secondResult] = await Promise.all([
      provider.getRoute(request),
      provider.getRoute(request),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(firstResult.geometry.coordinates).toEqual(secondResult.geometry.coordinates);
  });

  it('throws a friendly rate-limit error instead of raw LocationIQ JSON', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => '{"code":"Rate Limited Second"}',
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();

    await expect(
      provider.getRoute({
        startLatitude: 32,
        startLongitude: 35,
        endLatitude: 32.02,
        endLongitude: 35.02,
        alternativeRouteCount: 3,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: 'Route calculation is temporarily busy. Please try again in a moment.',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('releases the in-flight request after a timeout so the same route can be retried', async () => {
    jest.useFakeTimers();

    const fetchMock = jest
      .fn()
      .mockImplementationOnce(
        (_url: string, options?: { signal?: AbortSignal }) =>
          new Promise((_, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => {
                const abortError = new Error('aborted');
                abortError.name = 'AbortError';
                reject(abortError);
              },
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              distance: 4200,
              duration: 900,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [35, 32],
                  [35.01, 32.01],
                ],
              },
            },
          ],
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();
    const request = {
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      alternativeRouteCount: 3,
    };

    const timedOutRequest = expect(provider.getRoute(request)).rejects.toMatchObject({
      status: HttpStatus.GATEWAY_TIMEOUT,
      response: 'Route calculation timed out. Please try again.',
    });

    await jest.advanceTimersByTimeAsync(12050);
    await timedOutRequest;

    const retryResult = await provider.getRoute(request);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retryResult.geometry.coordinates).toEqual([
      [35, 32],
      [35.01, 32.01],
    ]);
  });

  it('prefers the fastest candidate when avoidance scores are tied', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 7600,
            duration: 1320,
            geometry: {
              type: 'LineString',
              coordinates: [
                [35, 32],
                [35.05, 32.02],
              ],
            },
          },
          {
            distance: 9100,
            duration: 1020,
            geometry: {
              type: 'LineString',
              coordinates: [
                [35, 32],
                [35.06, 32.03],
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();
    const result = await provider.getRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      alternativeRouteCount: 3,
    });

    expect(result.estimatedDurationMinutes).toBe(17);
    expect(result.geometry.coordinates).toEqual([
      [35, 32],
      [35.06, 32.03],
    ]);
    expect(result.alternativeRoutes).toHaveLength(1);
    expect(result.alternativeRoutes?.[0].geometry.coordinates).toEqual([
      [35, 32],
      [35.05, 32.02],
    ]);
  });

  it('includes detour via points in the provider request path', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 4200,
            duration: 900,
            geometry: {
              type: 'LineString',
              coordinates: [
                [35, 32],
                [35.03, 32.04],
                [35.01, 32.01],
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as typeof fetch;

    const provider = new LocationIqRoutingProvider();

    await provider.getRoute({
      startLatitude: 32,
      startLongitude: 35,
      endLatitude: 32.02,
      endLongitude: 35.02,
      viaPoints: [{ latitude: 32.04, longitude: 35.03 }],
      alternativeRouteCount: 3,
    });

    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/35,32;35.03,32.04;35.02,32.02?',
    );
  });
});
