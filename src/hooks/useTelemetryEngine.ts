import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWeather } from "../services/WeatherApi";
import type {
  EventLog,
  NodePayload,
  Scenario,
  Station,
} from "../types/telemetry";

const airports = [
  ["KDFW", "Dallas / Fort Worth", "Dallas, TX"],
  ["KLAX", "Los Angeles International", "Los Angeles, CA"],
  ["KJFK", "John F. Kennedy International", "New York, NY"],
  ["KORD", "Chicago O’Hare International", "Chicago, IL"],
];

function createStations(): Station[] {
  const at = Date.now();
  return airports.map(([id, name, location], index) => ({
    id,
    name,
    location,
    nodeId: `EDGE-${String(index + 1).padStart(3, "0")}`,
    weather: null,
    events: [],
    node: {
      paused: false,
      scenario: "normal",
      bootedAt: at - (12 + index * 3) * 86400000,
      lastHeartbeat: at,
      cpuTemperatureC: 48 + index,
      latencyMs: 32 + index * 17,
      history: [
        { at, cpu: 48 + index, latency: 32 + index * 17, reporting: true },
      ],
    },
  }));
}

export function nodeStatus(
  node: NodePayload,
): "Offline" | "Warning" | "Reporting" {
  if (node.paused) return "Offline";
  if (node.cpuTemperatureC >= 70 || node.latencyMs >= 200) return "Warning";
  return "Reporting";
}

function event(
  station: Station,
  at: number,
  message: string,
  kind: EventLog["kind"],
): EventLog {
  return {
    id: (station.events[0]?.id ?? 0) + 1,
    at,
    message,
    kind,
    acknowledged: false,
  };
}

export function useTelemetryEngine() {
  const [stations, setStations] = useState<Station[]>(createStations);
  const [now, setNow] = useState(Date.now);
  const [feed, setFeed] = useState<{
    loading: boolean;
    error: boolean;
    fetchedAt: number | null;
  }>({ loading: true, error: false, fetchedAt: null });
  const [feedPaused, setFeedPaused] = useState(false);
  const [pollSeconds, setPollSeconds] = useState(60);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 16000);
    setFeed((previous) => ({ ...previous, loading: true }));
    try {
      const result = await fetchWeather(request.signal);
      if (!mounted.current || request.signal.aborted) return;
      setStations((previous) =>
        previous.map((station) => {
          const incoming = result.weather.get(station.id);
          if (
            !incoming ||
            (station.weather?.observedAt ?? 0) > (incoming.observedAt ?? 0)
          )
            return station;
          return { ...station, weather: incoming };
        }),
      );
      setFeed({ loading: false, error: false, fetchedAt: result.fetchedAt });
    } catch {
      if (mounted.current && controller.current === request)
        setFeed((previous) => ({ ...previous, loading: false, error: true }));
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === request) controller.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const tick = window.setInterval(() => {
      const at = Date.now();
      setNow(at);
      setStations((previous) =>
        previous.map((station) => {
          const node = station.node;
          // Missed heartbeats create history gaps without changing device readings.
          const automatic = node.scenario === "normal";
          const cpu =
            !node.paused && automatic
              ? Math.min(
                  55,
                  Math.max(
                    45,
                    node.cpuTemperatureC + (Math.random() - 0.5) * 0.6,
                  ),
                )
              : node.cpuTemperatureC;
          const latency =
            !node.paused && automatic
              ? Math.round(
                  Math.min(
                    150,
                    Math.max(20, node.latencyMs + (Math.random() - 0.5) * 10),
                  ),
                )
              : node.latencyMs;
          return {
            ...station,
            node: {
              ...node,
              cpuTemperatureC: cpu,
              latencyMs: latency,
              lastHeartbeat: node.paused ? node.lastHeartbeat : at,
              history: [
                ...node.history.slice(-119),
                { at, cpu, latency, reporting: !node.paused },
              ],
            },
          };
        }),
      );
    }, 1000);
    return () => {
      mounted.current = false;
      window.clearInterval(tick);
      controller.current?.abort();
      controller.current = null;
    };
  }, [refresh]);

  useEffect(() => {
    if (feedPaused) return;
    const poll = window.setInterval(() => void refresh(), pollSeconds * 1000);
    return () => window.clearInterval(poll);
  }, [refresh, feedPaused, pollSeconds]);

  const applyScenario = useCallback(
    (id: string, scenario: Exclude<Scenario, "custom">) => {
      const at = Date.now();
      const messages = {
        normal: "Normal operation restored",
        outage: "Heartbeat stopped by simulator",
        latency: "Network latency raised to 350 ms",
        thermal: "CPU temperature raised to 82°C",
      };
      setStations((previous) =>
        previous.map((station) => {
          if (station.id !== id || station.node.scenario === scenario)
            return station;
          const paused = scenario === "outage";
          const cpu = scenario === "thermal" ? 82 : 49;
          const latency = scenario === "latency" ? 350 : 45;
          return {
            ...station,
            node: {
              ...station.node,
              scenario,
              paused,
              cpuTemperatureC: paused ? station.node.cpuTemperatureC : cpu,
              latencyMs: paused ? station.node.latencyMs : latency,
              lastHeartbeat: paused ? station.node.lastHeartbeat : at,
            },
            events: [
              event(
                station,
                at,
                messages[scenario],
                scenario === "normal"
                  ? "recovery"
                  : paused
                    ? "outage"
                    : "warning",
              ),
              ...station.events,
            ].slice(0, 100),
          };
        }),
      );
    },
    [],
  );

  const setMetrics = useCallback((id: string, cpu: number, latency: number) => {
    const at = Date.now();
    setStations((previous) =>
      previous.map((station) => {
        if (station.id !== id || station.node.paused) return station;
        const temperature = Math.min(90, Math.max(40, cpu));
        const network = Math.min(500, Math.max(20, latency));
        return {
          ...station,
          node: {
            ...station.node,
            scenario: "custom",
            cpuTemperatureC: temperature,
            latencyMs: network,
          },
          events: [
            event(
              station,
              at,
              `Manual readings applied · ${temperature}°C / ${network} ms`,
              temperature >= 70 || network >= 200 ? "warning" : "info",
            ),
            ...station.events,
          ].slice(0, 100),
        };
      }),
    );
  }, []);

  const acknowledge = useCallback((id: string, eventId: number) => {
    setStations((previous) =>
      previous.map((station) =>
        station.id !== id
          ? station
          : {
              ...station,
              events: station.events.map((item) =>
                item.id === eventId ? { ...item, acknowledged: true } : item,
              ),
            },
      ),
    );
  }, []);
  return {
    stations,
    now,
    feed,
    refresh,
    applyScenario,
    setMetrics,
    acknowledge,
    feedPaused,
    setFeedPaused,
    pollSeconds,
    setPollSeconds,
  };
}
