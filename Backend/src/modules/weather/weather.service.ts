import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CurrentWeatherQueryDto } from './dto/current-weather-query.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';

@Injectable()
export class WeatherService {
  private readonly weatherApiBaseUrl =
    'https://api.weatherapi.com/v1/current.json';
  private readonly openMeteoBaseUrl = 'https://api.open-meteo.com/v1/forecast';

  async getCurrentWeather(
    query: CurrentWeatherQueryDto,
  ): Promise<CurrentWeatherResponseDto> {
    const apiKey = process.env.WEATHER_API_KEY?.trim();

    if (!apiKey) {
      return this.fetchOpenMeteoOrThrow(query);
    }

    try {
      return await this.fetchWeatherApiWeather(query, apiKey);
    } catch (error) {
      return this.fetchOpenMeteoOrThrow(query, error);
    }
  }

  private async fetchWeatherApiWeather(
    query: CurrentWeatherQueryDto,
    apiKey: string,
  ): Promise<CurrentWeatherResponseDto> {
    const url =
      `${this.weatherApiBaseUrl}?key=${encodeURIComponent(apiKey)}` +
      `&q=${query.latitude},${query.longitude}` +
      '&aqi=no';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        'Live weather could not be loaded for the selected location.',
      );
    }

    const payload = await response.json();
    const current = payload?.current;
    const location = payload?.location;

    if (!current || !location) {
      throw new Error('The weather provider returned an invalid response.');
    }

    return {
      locationName: [location.name, location.region].filter(Boolean).join(', '),
      latitude: Number(location.lat),
      longitude: Number(location.lon),
      temperatureCelsius: Number(current.temp_c),
      conditionText: String(current.condition?.text || '').trim(),
      windKph: Number(current.wind_kph),
      isDay: Number(current.is_day) === 1,
      observedAt: String(location.localtime || '').trim(),
    };
  }

  private async fetchOpenMeteoWeather(
    query: CurrentWeatherQueryDto,
  ): Promise<CurrentWeatherResponseDto> {
    const url =
      `${this.openMeteoBaseUrl}?latitude=${encodeURIComponent(query.latitude)}` +
      `&longitude=${encodeURIComponent(query.longitude)}` +
      '&current=temperature_2m,weather_code,wind_speed_10m,is_day' +
      '&timezone=auto';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        'Live weather could not be loaded for the selected location.',
      );
    }

    const payload = await response.json();
    const current = payload?.current ?? payload?.current_weather;
    const latitude = Number(payload?.latitude ?? query.latitude);
    const longitude = Number(payload?.longitude ?? query.longitude);
    const temperatureCelsius = Number(
      current?.temperature_2m ?? current?.temperature,
    );
    const windKph = Number(current?.wind_speed_10m ?? current?.windspeed);
    const weatherCode = Number(current?.weather_code ?? current?.weathercode);

    if (
      !current ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(temperatureCelsius) ||
      !Number.isFinite(windKph) ||
      !Number.isFinite(weatherCode)
    ) {
      throw new Error('The weather provider returned an invalid response.');
    }

    return {
      locationName: this.formatCoordinateLabel(latitude, longitude),
      latitude,
      longitude,
      temperatureCelsius,
      conditionText: this.mapWeatherCodeToCondition(weatherCode),
      windKph,
      isDay: Number(current?.is_day ?? 1) === 1,
      observedAt: String(current?.time || '').trim(),
    };
  }

  private async fetchOpenMeteoOrThrow(
    query: CurrentWeatherQueryDto,
    previousError?: unknown,
  ): Promise<CurrentWeatherResponseDto> {
    try {
      return await this.fetchOpenMeteoWeather(query);
    } catch (error) {
      throw new ServiceUnavailableException(
        this.buildFailureMessage(error ?? previousError),
      );
    }
  }

  private formatCoordinateLabel(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  private mapWeatherCodeToCondition(code: number): string {
    if (code === 0) {
      return 'Clear sky';
    }

    if (code === 1) {
      return 'Mainly clear';
    }

    if (code === 2) {
      return 'Partly cloudy';
    }

    if (code === 3) {
      return 'Overcast';
    }

    if (code === 45 || code === 48) {
      return 'Fog';
    }

    if ([51, 53, 55, 56, 57].includes(code)) {
      return 'Drizzle';
    }

    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
      return 'Rain';
    }

    if ([71, 73, 75, 77, 85, 86].includes(code)) {
      return 'Snow';
    }

    if (code === 95) {
      return 'Thunderstorm';
    }

    if (code === 96 || code === 99) {
      return 'Thunderstorm with hail';
    }

    return 'Live weather loaded';
  }

  private buildFailureMessage(error: unknown): string {
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String(error.message || '').trim()
        : '';

    return (
      message || 'Live weather could not be loaded for the selected location.'
    );
  }
}
