import { useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  LayoutList,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { nodeStatus, useTelemetryEngine } from "./hooks/useTelemetryEngine";
import { TelemetryChart } from "./components/TelemetryChart";
import { TestControls } from "./components/TestControls";
import { EventTable } from "./components/EventTable";
import { age, downloadJson, uptime, utc } from "./format";
import type { Station } from "./types/telemetry";

function Status({ station }: { station: Station }) {
  const status = nodeStatus(station.node);
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i />
      {status}
    </span>
  );
}

export default function App() {
  const engine = useTelemetryEngine();
  const { stations, now, feed } = engine;
  const [selectedId, setSelectedId] = useState("KDFW");
  const [page, setPage] = useState<"fleet" | "incidents" | "activity">("fleet");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"id" | "cpu" | "latency">("id");
  const [descending, setDescending] = useState(false);
  const [tab, setTab] = useState<"telemetry" | "payload" | "events">(
    "telemetry",
  );
  const [metric, setMetric] = useState<"cpu" | "latency">("latency");
  const [seconds, setSeconds] = useState(60);
  const [notice, setNotice] = useState("");
  const selected = stations.find((station) => station.id === selectedId)!;
  const offline = stations.filter((station) => station.node.paused).length;
  const warning = stations.filter(
    (station) => nodeStatus(station.node) === "Warning",
  ).length;
  const allEvents = stations
    .flatMap((station) =>
      station.events.map((event) => ({ ...event, stationId: station.id })),
    )
    .sort((a, b) => b.at - a.at || b.id - a.id);
  const incidents = allEvents.filter(
    (event) =>
      (event.kind === "outage" || event.kind === "warning") &&
      !event.acknowledged,
  );
  const visible = stations
    .filter(
      (station) =>
        `${station.id} ${station.name} ${station.location}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (filter === "all" || nodeStatus(station.node) !== "Reporting"),
    )
    .sort((a, b) => {
      const comparison =
        sort === "id"
          ? a.id.localeCompare(b.id)
          : sort === "cpu"
            ? a.node.cpuTemperatureC - b.node.cpuTemperatureC
            : a.node.latencyMs - b.node.latencyMs;
      return descending ? -comparison : comparison;
    });
  const selectStation = (id: string) => {
    setSelectedId(id);
    setPage("fleet");
  };
  const changeSort = (key: "id" | "cpu" | "latency") => {
    if (sort === key) setDescending(!descending);
    else {
      setSort(key);
      setDescending(false);
    }
  };
  const exportReport = () => {
    downloadJson(
      `awos-${selected.id}-${new Date(now).toISOString().slice(0, 10)}.json`,
      {
        generatedAt: new Date(now).toISOString(),
        sources: {
          weather: "NWS Aviation Weather Center",
          hardware: "Simulated in this browser",
        },
        feedLastRetrievedAt: feed.fetchedAt,
        station: selected,
      },
    );
    setNotice(`${selected.id} report downloaded`);
  };
  const weather = selected.weather;
  const state = nodeStatus(selected.node);
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="#main">
          <RadioTower size={21} />
          <strong>
            AWOS<span>station diagnostics</span>
          </strong>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Workspace">
          <button
            className={page === "fleet" ? "active" : ""}
            onClick={() => setPage("fleet")}
          >
            <LayoutList size={16} />
            Stations<span>{stations.length}</span>
          </button>
          <button
            className={page === "incidents" ? "active" : ""}
            onClick={() => setPage("incidents")}
          >
            <TriangleAlert size={16} />
            Incidents
            <span className={incidents.length ? "count-alert" : ""}>
              {incidents.length}
            </span>
          </button>
          <button
            className={page === "activity" ? "active" : ""}
            onClick={() => setPage("activity")}
          >
            <Activity size={16} />
            Activity<span>{allEvents.length}</span>
          </button>
        </nav>
        <div className="sidebar-label station-list-title">
          MONITORED STATIONS
        </div>
        <div className="station-nav">
          {stations.map((station) => (
            <button
              key={station.id}
              className={
                selectedId === station.id && page === "fleet" ? "selected" : ""
              }
              onClick={() => selectStation(station.id)}
            >
              <span
                className={`status-light ${nodeStatus(station.node).toLowerCase()}`}
              />
              <span>
                <strong>{station.id}</strong>
                <small>{station.location}</small>
              </span>
              <ChevronRight size={13} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <span className="sidebar-label">DATA SOURCES</span>
          <div>
            <span
              className={`status-light ${feed.error ? "warning" : "reporting"}`}
            />
            NWS / Aviation Weather Center
          </div>
          <div>
            <span className="sim-square" />
            Edge telemetry · simulated
          </div>
          <p>Session data clears on reload.</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <select
            className="mobile-view-select"
            aria-label="Workspace view"
            value={page}
            onChange={(event) => setPage(event.target.value as typeof page)}
          >
            <option value="fleet">Stations</option>
            <option value="incidents">Incidents ({incidents.length})</option>
            <option value="activity">Activity ({allEvents.length})</option>
          </select>
          <div className="breadcrumbs">
            Workspace
            <ChevronRight size={12} />
            <strong>
              {page === "fleet"
                ? "Stations"
                : page === "incidents"
                  ? "Incidents"
                  : "Activity"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="utc-clock">{utc(now)} UTC</span>
            <button onClick={exportReport}>
              <Download size={14} />
              Export {selected.id}
            </button>
          </div>
        </header>
        <main id="main">
          <div className="page-title">
            <div>
              <h1>
                {page === "fleet"
                  ? "Stations"
                  : page === "incidents"
                    ? "Incident review"
                    : "Activity log"}
              </h1>
              <p>
                {page === "fleet"
                  ? "Airport observations and edge telemetry"
                  : page === "incidents"
                    ? "Unacknowledged simulator faults across the fleet"
                    : "All fault injections, adjustments, and recoveries in this session"}
              </p>
            </div>
            <div className="poll-controls">
              <select
                aria-label="Weather polling interval"
                value={engine.pollSeconds}
                onChange={(event) =>
                  engine.setPollSeconds(Number(event.target.value))
                }
              >
                <option value={60}>Refresh every 60s</option>
                <option value={120}>Refresh every 2m</option>
                <option value={300}>Refresh every 5m</option>
              </select>
              <button
                aria-label={
                  engine.feedPaused
                    ? "Resume weather polling"
                    : "Pause weather polling"
                }
                title={
                  engine.feedPaused
                    ? "Resume weather polling"
                    : "Pause weather polling"
                }
                aria-pressed={engine.feedPaused}
                onClick={() => engine.setFeedPaused(!engine.feedPaused)}
              >
                {engine.feedPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button
                className="primary-button"
                disabled={feed.loading}
                onClick={() => void engine.refresh()}
              >
                <RefreshCw
                  size={13}
                  className={feed.loading ? "animate-spin" : ""}
                />
                {feed.loading ? "Fetching…" : "Refresh"}
              </button>
            </div>
          </div>
          {notice && (
            <div className="notice" role="status">
              <Check size={14} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="fleet-summary" aria-label="Fleet summary">
            <span>
              <i className="status-light reporting" />
              <strong>{stations.length - offline}</strong> reporting
            </span>
            <span>
              <i className="status-light warning" />
              <strong>{warning}</strong> warning
            </span>
            <span>
              <i className="status-light offline" />
              <strong>{offline}</strong> offline
            </span>
            <div className="feed-indicator">
              <span
                className={`status-light ${feed.error ? "warning" : "reporting"}`}
              />
              {feed.error
                ? "Weather feed interrupted"
                : engine.feedPaused
                  ? "Weather polling paused"
                  : "Weather feed connected"}
              <time>
                {feed.fetchedAt
                  ? `Retrieved ${utc(feed.fetchedAt)} UTC`
                  : "Awaiting first response"}
              </time>
            </div>
          </div>
          {feed.error && (
            <div className="feed-warning" role="status">
              The weather request failed. Previous observations retain their
              original timestamps. Use Refresh to retry.
            </div>
          )}
          {page === "fleet" ? (
            <>
              <section
                className="panel fleet-panel"
                aria-label="Fleet stations"
              >
                <div className="table-toolbar">
                  <div className="search-field">
                    <Search size={14} />
                    <input
                      aria-label="Search stations"
                      placeholder="Find a station…"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div>
                    <select
                      aria-label="Station status filter"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                    >
                      <option value="all">All states</option>
                      <option value="attention">Needs attention</option>
                    </select>
                    <span className="result-count">
                      {visible.length} of {stations.length} stations
                    </span>
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="fleet-table">
                    <thead>
                      <tr>
                        <th>
                          <button onClick={() => changeSort("id")}>
                            Station
                            {sort === "id" ? (
                              descending ? (
                                <ArrowDown size={11} />
                              ) : (
                                <ArrowUp size={11} />
                              )
                            ) : null}
                          </button>
                        </th>
                        <th>Node state</th>
                        <th>
                          <button onClick={() => changeSort("cpu")}>
                            CPU °C
                            {sort === "cpu" ? (
                              descending ? (
                                <ArrowDown size={11} />
                              ) : (
                                <ArrowUp size={11} />
                              )
                            ) : null}
                          </button>
                        </th>
                        <th>
                          <button onClick={() => changeSort("latency")}>
                            RTT ms
                            {sort === "latency" ? (
                              descending ? (
                                <ArrowDown size={11} />
                              ) : (
                                <ArrowUp size={11} />
                              )
                            ) : null}
                          </button>
                        </th>
                        <th>Last heartbeat</th>
                        <th>Flight category</th>
                        <th>Observed (UTC)</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((station) => (
                        <tr
                          key={station.id}
                          className={
                            selectedId === station.id ? "selected-row" : ""
                          }
                        >
                          <td>
                            <button
                              className="station-link"
                              onClick={() => selectStation(station.id)}
                            >
                              <strong>{station.id}</strong>
                              <span>{station.location}</span>
                            </button>
                          </td>
                          <td>
                            <Status station={station} />
                          </td>
                          <td
                            className={`mono ${station.node.cpuTemperatureC >= 70 ? "warning-text" : ""}`}
                          >
                            {station.node.cpuTemperatureC.toFixed(1)}
                          </td>
                          <td
                            className={`mono ${station.node.latencyMs >= 200 ? "warning-text" : ""}`}
                          >
                            {station.node.latencyMs}
                          </td>
                          <td>
                            <time
                              className="mono"
                              title={new Date(
                                station.node.lastHeartbeat,
                              ).toUTCString()}
                            >
                              {age(station.node.lastHeartbeat, now)}
                            </time>
                          </td>
                          <td>
                            <span
                              className={`flight flight-${station.weather?.flightCategory.toLowerCase() ?? "unknown"}`}
                            >
                              <i />
                              {station.weather?.flightCategory ?? "Unknown"}
                            </span>
                          </td>
                          <td className="mono muted">
                            {station.weather?.observedAt
                              ? utc(station.weather.observedAt)
                              : "—"}
                          </td>
                          <td>
                            <button
                              className="inspect-button"
                              aria-label={`Inspect ${station.id}`}
                              onClick={() => selectStation(station.id)}
                            >
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {visible.length === 0 && (
                  <div className="empty-state compact">
                    <strong>No matching stations</strong>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery("");
                        setFilter("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                <div className="table-foot">
                  <span>
                    Weather observed at source · Heartbeat received by simulator
                  </span>
                  <span>Click a station to inspect</span>
                </div>
              </section>
              <section
                className="station-inspector"
                aria-label={`${selected.id} station inspector`}
              >
                <div className="inspector-heading">
                  <div>
                    <h2>
                      <span className="mono">{selected.id}</span>
                      <span>{selected.name}</span>
                    </h2>
                    <p>
                      <span className="mono">{selected.nodeId}</span>
                      <span>Ubuntu / Raspberry Pi 4B · simulated</span>
                    </p>
                  </div>
                  <Status station={selected} />
                </div>
                <div className="inspector-layout">
                  <div className="inspector-main">
                    <div
                      className="tabbar"
                      role="tablist"
                      aria-label="Station details"
                    >
                      {(["telemetry", "payload", "events"] as const).map(
                        (value) => (
                          <button
                            role="tab"
                            aria-selected={tab === value}
                            key={value}
                            onClick={() => setTab(value)}
                          >
                            {value === "telemetry"
                              ? "Telemetry"
                              : value === "payload"
                                ? "Raw payload"
                                : `Events (${selected.events.length})`}
                          </button>
                        ),
                      )}
                    </div>
                    {tab === "telemetry" ? (
                      <div role="tabpanel" aria-label="Telemetry">
                        <div
                          className={`station-message ${state.toLowerCase()}`}
                        >
                          {state === "Offline" ? (
                            <>
                              <TriangleAlert size={14} />
                              <span>
                                Heartbeat stopped. Showing last device readings
                                from{" "}
                                <time>
                                  {utc(selected.node.lastHeartbeat)} UTC
                                </time>
                                .
                              </span>
                            </>
                          ) : state === "Warning" ? (
                            <>
                              <TriangleAlert size={14} />
                              <span>
                                {selected.node.cpuTemperatureC >= 70
                                  ? "CPU temperature exceeds the 70°C threshold."
                                  : "Network latency exceeds the 200 ms threshold."}{" "}
                                Heartbeats are still arriving.
                              </span>
                            </>
                          ) : (
                            <>
                              <Check size={14} />
                              <span>
                                Node reporting normally. Last heartbeat{" "}
                                <time>
                                  {age(selected.node.lastHeartbeat, now)}
                                </time>
                                .
                              </span>
                            </>
                          )}
                        </div>
                        <div className="telemetry-strip">
                          <div>
                            <span>CPU temperature</span>
                            <strong
                              className={
                                selected.node.cpuTemperatureC >= 70
                                  ? "warning-text"
                                  : ""
                              }
                            >
                              {selected.node.cpuTemperatureC.toFixed(1)}
                              <small>°C</small>
                            </strong>
                          </div>
                          <div>
                            <span>Network latency</span>
                            <strong
                              className={
                                selected.node.latencyMs >= 200
                                  ? "warning-text"
                                  : ""
                              }
                            >
                              {selected.node.latencyMs}
                              <small>ms</small>
                            </strong>
                          </div>
                          <div>
                            <span>Last reported uptime</span>
                            <strong className="uptime-value">
                              {uptime(
                                selected.node.lastHeartbeat -
                                  selected.node.bootedAt,
                              )}
                            </strong>
                          </div>
                        </div>
                        <div className="chart-panel">
                          <div className="chart-toolbar">
                            <div className="segmented">
                              <button
                                aria-pressed={metric === "latency"}
                                onClick={() => setMetric("latency")}
                              >
                                Latency
                              </button>
                              <button
                                aria-pressed={metric === "cpu"}
                                onClick={() => setMetric("cpu")}
                              >
                                CPU
                              </button>
                            </div>
                            <select
                              aria-label="Chart time range"
                              value={seconds}
                              onChange={(event) =>
                                setSeconds(Number(event.target.value))
                              }
                            >
                              <option value={30}>Last 30 seconds</option>
                              <option value={60}>Last 60 seconds</option>
                              <option value={120}>Last 2 minutes</option>
                            </select>
                          </div>
                          <TelemetryChart
                            samples={selected.node.history}
                            metric={metric}
                            seconds={seconds}
                            now={now}
                          />
                        </div>
                        <div className="heartbeat-history">
                          <span>Heartbeat history</span>
                          <div
                            className="heartbeat-cells"
                            aria-label="Recorded heartbeat samples"
                          >
                            {selected.node.history.slice(-60).map((sample) => (
                              <span
                                key={sample.at}
                                className={
                                  sample.reporting ? "received" : "missed"
                                }
                                title={`${utc(sample.at)} UTC · ${sample.reporting ? "Received" : "Missed"}`}
                              />
                            ))}
                          </div>
                          <small>1 sample / second · newest at right</small>
                        </div>
                        <div className="weather-detail">
                          <div className="weather-title">
                            <h3>Airport weather</h3>
                            <span>LIVE METAR · NWS / AWC</span>
                          </div>
                          <div className="weather-values">
                            <div>
                              <span>Temperature</span>
                              <strong>
                                {weather?.temperatureC?.toFixed(1) ?? "—"}
                                <small>°C</small>
                              </strong>
                            </div>
                            <div>
                              <span>Wind</span>
                              <strong>
                                {weather?.windSpeedKt === 0
                                  ? "Calm"
                                  : weather?.windSpeedKt == null
                                    ? "—"
                                    : `${weather.windDirection === "VRB" ? "VRB" : weather.windDirection == null ? "—" : `${weather.windDirection}°`} / ${weather.windSpeedKt}`}
                                <small>
                                  {weather?.windSpeedKt ? "kt" : ""}
                                </small>
                              </strong>
                            </div>
                            <div>
                              <span>Altimeter</span>
                              <strong>
                                {weather?.altimeterHpa?.toFixed(1) ?? "—"}
                                <small>hPa</small>
                              </strong>
                            </div>
                            <div>
                              <span>Flight category</span>
                              <span
                                className={`flight flight-${weather?.flightCategory.toLowerCase() ?? "unknown"}`}
                              >
                                <i />
                                {weather?.flightCategory ?? "Unknown"}
                              </span>
                            </div>
                          </div>
                          <div className="observation-note">
                            Observed{" "}
                            <time
                              title={
                                weather?.observedAt
                                  ? new Date(weather.observedAt).toUTCString()
                                  : undefined
                              }
                            >
                              {weather?.observedAt
                                ? `${utc(weather.observedAt)} UTC · ${age(weather.observedAt, now)}`
                                : "unavailable"}
                            </time>
                            <span>
                              {weather?.observedAt &&
                              now - weather.observedAt > 90 * 60000
                                ? "Observation older than 90 minutes"
                                : "Independent of the simulated node"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : tab === "payload" ? (
                      <div
                        role="tabpanel"
                        className="payload-panel"
                        aria-label="Raw payload"
                      >
                        <div className="payload-toolbar">
                          <span>Current station snapshot</span>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  JSON.stringify(selected, null, 2),
                                );
                                setNotice(`${selected.id} payload copied`);
                              } catch {
                                setNotice(
                                  "Clipboard unavailable. Export the report to save this payload.",
                                );
                              }
                            }}
                          >
                            <Clipboard size={13} />
                            Copy JSON
                          </button>
                        </div>
                        <h4>Source METAR</h4>
                        <pre className="raw-metar">
                          {weather?.rawReport ?? "No METAR received yet."}
                        </pre>
                        <h4>Normalized weather & simulated node</h4>
                        <pre className="json-payload">
                          {JSON.stringify(
                            {
                              ...selected,
                              node: {
                                ...selected.node,
                                history: `${selected.node.history.length} samples · included in exported report`,
                              },
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                    ) : (
                      <div role="tabpanel" aria-label="Station event history">
                        <EventTable
                          events={selected.events.map((item) => ({
                            ...item,
                            stationId: selected.id,
                          }))}
                          onAcknowledge={engine.acknowledge}
                          onSelect={selectStation}
                        />
                      </div>
                    )}
                  </div>
                  <TestControls
                    key={selected.id}
                    station={selected}
                    onScenario={engine.applyScenario}
                    onMetrics={engine.setMetrics}
                  />
                </div>
              </section>
            </>
          ) : (
            <section className="panel log-panel">
              <div className="panel-heading">
                <h2>
                  {page === "incidents" ? "Pending review" : "Session events"}
                </h2>
                <span className="mono muted">
                  {page === "incidents" ? incidents.length : allEvents.length}{" "}
                  events
                </span>
              </div>
              <EventTable
                events={page === "incidents" ? incidents : allEvents}
                onAcknowledge={engine.acknowledge}
                onSelect={selectStation}
              />
            </section>
          )}
          <footer>
            <span>
              Weather timestamps are UTC. Hardware measurements are simulated.
            </span>
            <span className="mono">
              {new Date(now).toISOString().slice(0, 10)}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
