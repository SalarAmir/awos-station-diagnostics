# AWOS Station Diagnostics

A React 18 dashboard combining real airport METAR observations with explicitly simulated edge telemetry.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Its same-origin `/api/weather` endpoint requests the four configured airports from the NWS Aviation Weather Center. Internet access is required for weather and Google Fonts. System font fallbacks keep the interface usable when fonts cannot load.

```sh
npm run check
npm run build
```

The build creates the frontend in `dist/client` and a self-contained Cloudflare Worker in `dist/server/index.js`. The Worker serves the frontend and the same cached weather endpoint. A static-only host needs an equivalent server endpoint for weather.

## Behavior

- Weather polling defaults to 60 seconds. The toolbar offers 2- and 5-minute intervals, pause/resume, and manual refresh. Each server instance caches a successful upstream response for 60 seconds and shares concurrent requests.
- Airport observation time comes from `obsTime`. Feed retrieval time comes from the proxy. Pressure is displayed in hPa, wind speed in knots, and timestamps in UTC.
- Node heartbeats tick every second. CPU readings drift within 45–55°C and latency stays within 20–150 ms.
- Pausing immediately marks a simulated node offline and freezes its last readings. Heartbeat age continues increasing. Weather polling continues independently.
- Restore normal operation emits a new heartbeat. Each station retains up to 100 events, newest first.
- Stop heartbeat, Slow network, and Overheat CPU are repeatable fault presets. Custom sliders apply CPU values from 40–90°C and latency from 20–500 ms. Warning thresholds are 70°C and 200 ms. Custom values stay fixed until another preset or reading is applied.
- Search, state filtering, and sortable table columns narrow the fleet. Selecting a station opens its inspector. Live charts use up to 120 seconds of actual simulator samples collected since this page opened. Missed heartbeats appear as gaps and red history cells.
- The incident queue shows unacknowledged warning and outage events. Acknowledgment records review while preserving the original event. The Activity page retains every transition, adjustment, recovery, and acknowledgment state for the session.
- Raw payload exposes the source METAR and normalized station state. Copy JSON copies the complete station, including samples. Export downloads a JSON report with source labels, timestamps, readings, sample history, and events.
- Simulation state and event history reset on reload. Node boot times are simulated.
- Failed or incomplete weather requests preserve existing observations. Older observations cannot replace newer ones. Missing values display an em dash and missing categories display Unknown.
- An observation older than 90 minutes receives an age warning. This is a dashboard display threshold.

## Source layout

- `src/types/telemetry.ts` defines payloads and station state.
- `src/services/WeatherApi.ts` validates and normalizes the proxy response.
- `src/hooks/useTelemetryEngine.ts` manages independent polling and heartbeats.
- `src/App.tsx` renders fleet search, selection, station details, and workspace navigation.
- `src/components/TelemetryChart.tsx` renders sampled CPU or latency history with hover inspection.
- `src/components/TestControls.tsx` provides fault presets and custom readings.
- `src/components/EventTable.tsx` renders incident review and activity history.
- `server/weather.ts` owns the fixed upstream query, timeout, cache, and concurrency handling.
- `vite.config.ts` exposes the proxy during local development.
- `scripts/build-worker.mjs` packages the production frontend and proxy into one Worker.

## Verification

The layout was informed by Grafana's dashboard controls and Uptime Kuma's monitor inspection and heartbeat history. The implementation is original.

- https://github.com/grafana/grafana
- https://grafana.com/docs/grafana/latest/visualizations/dashboards/use-dashboards/
- https://github.com/louislam/uptime-kuma

TypeScript and the production build pass. Browser verification covers live METAR loading, fault presets, custom readings, outage isolation, recovery, incident acknowledgment, station selection, search and filtering, raw payload inspection, JSON downloads, and mobile navigation.
