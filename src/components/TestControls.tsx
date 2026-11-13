import { useEffect, useState } from "react";
import {
  Flame,
  Pause,
  RotateCcw,
  Signal,
  SlidersHorizontal,
} from "lucide-react";
import type { Scenario, Station } from "../types/telemetry";

export function TestControls({
  station,
  onScenario,
  onMetrics,
}: {
  station: Station;
  onScenario: (id: string, scenario: Exclude<Scenario, "custom">) => void;
  onMetrics: (id: string, cpu: number, latency: number) => void;
}) {
  const [cpu, setCpu] = useState(Math.round(station.node.cpuTemperatureC));
  const [latency, setLatency] = useState(station.node.latencyMs);
  useEffect(() => {
    setCpu(Math.round(station.node.cpuTemperatureC));
    setLatency(station.node.latencyMs);
  }, [station.node.scenario]);
  return (
    <aside className="panel test-controls" aria-label="Simulation controls">
      <div className="panel-heading">
        <h3>
          <SlidersHorizontal size={14} />
          Test controls
        </h3>
        <span className="tag">SIMULATOR</span>
      </div>
      <div className="control-body">
        <p>
          Inject a fault into <strong>{station.id}</strong> and watch its
          telemetry respond.
        </p>
        <div className="scenario-buttons">
          <button
            aria-pressed={station.node.scenario === "outage"}
            onClick={() => onScenario(station.id, "outage")}
          >
            <Pause size={14} />
            <span>
              Stop heartbeat<small>Retain the last device readings</small>
            </span>
          </button>
          <button
            aria-pressed={station.node.scenario === "latency"}
            onClick={() => onScenario(station.id, "latency")}
          >
            <Signal size={14} />
            <span>
              Slow network<small>Set latency to 350 ms</small>
            </span>
          </button>
          <button
            aria-pressed={station.node.scenario === "thermal"}
            onClick={() => onScenario(station.id, "thermal")}
          >
            <Flame size={14} />
            <span>
              Overheat CPU<small>Set temperature to 82°C</small>
            </span>
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onMetrics(station.id, cpu, latency);
          }}
        >
          <fieldset disabled={station.node.paused}>
            <legend>Custom readings</legend>
            <label htmlFor="cpu-input">
              CPU temperature <output htmlFor="cpu-input">{cpu} °C</output>
            </label>
            <input
              id="cpu-input"
              aria-label="CPU temperature"
              type="range"
              min="40"
              max="90"
              value={cpu}
              onChange={(event) => setCpu(Number(event.target.value))}
            />
            <label htmlFor="latency-input">
              Network latency{" "}
              <output htmlFor="latency-input">{latency} ms</output>
            </label>
            <input
              id="latency-input"
              aria-label="Network latency"
              type="range"
              min="20"
              max="500"
              step="1"
              value={latency}
              onChange={(event) => setLatency(Number(event.target.value))}
            />
            <button className="apply-button" type="submit">
              Apply readings
            </button>
          </fieldset>
        </form>
        <button
          className="restore-button"
          onClick={() => onScenario(station.id, "normal")}
          disabled={station.node.scenario === "normal"}
        >
          <RotateCcw size={13} />
          Restore normal operation
        </button>
        <div className="threshold-note">
          Warning thresholds <span>CPU ≥70°C · RTT ≥200 ms</span>
        </div>
      </div>
    </aside>
  );
}
