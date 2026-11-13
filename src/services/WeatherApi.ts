import type { FlightCategory, WeatherPayload } from "../types/telemetry";

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function fetchWeather(
  signal: AbortSignal,
): Promise<{ weather: Map<string, WeatherPayload>; fetchedAt: number }> {
  const response = await fetch("/api/weather", { signal });
  if (!response.ok) throw new Error("Weather feed unavailable");
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== "object" ||
    !("observations" in body) ||
    !Array.isArray(body.observations)
  ) {
    throw new Error("Invalid weather response");
  }
  const weather = new Map<string, WeatherPayload>();
  for (const record of body.observations) {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.icaoId !== "string"
    )
      continue;
    const category: FlightCategory = ["VFR", "MVFR", "IFR", "LIFR"].includes(
      record.fltCat,
    )
      ? record.fltCat
      : "Unknown";
    const observed = finite(record.obsTime);
    const payload: WeatherPayload = {
      temperatureC: finite(record.temp),
      windDirection: record.wdir === "VRB" ? "VRB" : finite(record.wdir),
      windSpeedKt: finite(record.wspd),
      altimeterHpa: finite(record.altim),
      flightCategory: category,
      observedAt: observed === null ? null : observed * 1000,
      rawReport: typeof record.rawOb === "string" ? record.rawOb : null,
    };
    if (
      !weather.has(record.icaoId) ||
      (payload.observedAt ?? 0) > (weather.get(record.icaoId)?.observedAt ?? 0)
    )
      weather.set(record.icaoId, payload);
  }
  const fetchedAt =
    "fetchedAt" in body && typeof body.fetchedAt === "string"
      ? Date.parse(body.fetchedAt)
      : NaN;
  if (!Number.isFinite(fetchedAt))
    throw new Error("Missing weather retrieval timestamp");
  return { weather, fetchedAt };
}
