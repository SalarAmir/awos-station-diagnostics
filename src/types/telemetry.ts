export type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR" | "Unknown";

// Optional fields reflect incomplete upstream reports. Parse at the API boundary.
export interface MetarResponse {
  icaoId?: string;
  temp?: number | null;
  wdir?: number | "VRB" | null;
  wspd?: number | null;
  altim?: number | null;
  fltCat?: string | null;
  obsTime?: number | null;
  rawOb?: string | null;
}
export interface WeatherPayload {
  temperatureC: number | null;
  windDirection: number | "VRB" | null;
  windSpeedKt: number | null;
  altimeterHpa: number | null;
  flightCategory: FlightCategory;
  observedAt: number | null;
  rawReport: string | null;
}
export interface TelemetrySample {
  at: number;
  cpu: number;
  latency: number;
  reporting: boolean;
}
export type Scenario = "normal" | "outage" | "latency" | "thermal" | "custom";
export interface NodePayload {
  paused: boolean;
  bootedAt: number;
  lastHeartbeat: number;
  cpuTemperatureC: number;
  latencyMs: number;
  history: TelemetrySample[];
  scenario: Scenario;
}
export interface EventLog {
  id: number;
  at: number;
  message: string;
  kind: "outage" | "recovery" | "warning" | "info";
  acknowledged: boolean;
}
export interface Station {
  id: string;
  name: string;
  location: string;
  nodeId: string;
  weather: WeatherPayload | null;
  node: NodePayload;
  events: EventLog[];
}
