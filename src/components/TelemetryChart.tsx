import { useEffect, useRef, useState } from "react";
import type { TelemetrySample } from "../types/telemetry";
import { utc } from "../format";

export function TelemetryChart({
  samples,
  metric,
  seconds,
  now,
}: {
  samples: TelemetrySample[];
  metric: "cpu" | "latency";
  seconds: number;
  now: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<TelemetrySample | null>(null);
  const visible = samples.filter((sample) => sample.at >= now - seconds * 1000);
  const ceiling = metric === "cpu" ? 100 : 500;
  const threshold = metric === "cpu" ? 70 : 200;
  const unit = metric === "cpu" ? "°C" : "ms";
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const paint = () => {
      const width = element.clientWidth,
        height = element.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      element.width = width * ratio;
      element.height = height * ratio;
      const context = element.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      const left = 42,
        right = 12,
        top = 15,
        bottom = 27;
      const plotWidth = width - left - right,
        plotHeight = height - top - bottom;
      const x = (at: number) =>
        left + ((at - (now - seconds * 1000)) / (seconds * 1000)) * plotWidth;
      const y = (value: number) => top + plotHeight * (1 - value / ceiling);
      context.font = '10px "IBM Plex Mono", monospace';
      context.lineWidth = 1;
      for (let index = 0; index <= 4; index++) {
        const value = (ceiling * index) / 4;
        context.strokeStyle = "#303339";
        context.beginPath();
        context.moveTo(left, y(value));
        context.lineTo(width - right, y(value));
        context.stroke();
        context.fillStyle = "#9a9da5";
        context.textAlign = "right";
        context.fillText(String(value), left - 9, y(value) + 3);
      }
      context.strokeStyle = "#ae884c";
      context.setLineDash([4, 4]);
      context.beginPath();
      context.moveTo(left, y(threshold));
      context.lineTo(width - right, y(threshold));
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "#bfa374";
      context.textAlign = "right";
      context.fillText(
        `alert ≥ ${threshold}${unit}`,
        width - right,
        y(threshold) - 6,
      );
      context.strokeStyle = "#78a9df";
      context.lineWidth = 1.8;
      context.beginPath();
      let connected = false;
      for (const sample of visible) {
        if (!sample.reporting) {
          connected = false;
          continue;
        }
        if (connected) context.lineTo(x(sample.at), y(sample[metric]));
        else context.moveTo(x(sample.at), y(sample[metric]));
        connected = true;
      }
      context.stroke();
      const last = visible.at(-1);
      if (last?.reporting) {
        context.fillStyle = "#8cb7e8";
        context.beginPath();
        context.arc(x(last.at), y(last[metric]), 3, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#9a9da5";
      context.textAlign = "left";
      context.fillText(`−${seconds}s`, left, height - 6);
      context.textAlign = "center";
      context.fillText(`−${seconds / 2}s`, left + plotWidth / 2, height - 6);
      context.textAlign = "right";
      context.fillText("now", width - right, height - 6);
    };
    paint();
    const resize = new ResizeObserver(paint);
    resize.observe(element);
    return () => resize.disconnect();
  }, [visible, metric, now, seconds, ceiling, threshold, unit]);
  return (
    <div className="chart-wrap">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`${metric === "cpu" ? "CPU temperature" : "Network latency"} over the last ${seconds} seconds. Gaps indicate missed heartbeats.`}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const time =
            now -
            seconds * 1000 +
            Math.max(
              0,
              Math.min(
                1,
                (event.clientX - bounds.left - 42) / (bounds.width - 54),
              ),
            ) *
              seconds *
              1000;
          setHover(
            visible.reduce<TelemetrySample | null>(
              (nearest, sample) =>
                !nearest ||
                Math.abs(sample.at - time) < Math.abs(nearest.at - time)
                  ? sample
                  : nearest,
              null,
            ),
          );
        }}
        onPointerLeave={() => setHover(null)}
      />
      <div className="chart-readout">
        {hover
          ? `${utc(hover.at)} UTC · ${hover.reporting ? `${hover[metric].toFixed(metric === "cpu" ? 1 : 0)} ${unit}` : "Heartbeat missed"}`
          : "Hover to inspect a sample · Gaps indicate missed heartbeats"}
      </div>
    </div>
  );
}
