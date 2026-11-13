import { Check, CheckCheck } from "lucide-react";
import type { EventLog } from "../types/telemetry";
import { utc } from "../format";
export interface FleetEvent extends EventLog {
  stationId: string;
}

export function EventTable({
  events,
  onAcknowledge,
  onSelect,
}: {
  events: FleetEvent[];
  onAcknowledge: (id: string, eventId: number) => void;
  onSelect: (id: string) => void;
}) {
  if (events.length === 0)
    return (
      <div className="empty-state">
        <CheckCheck size={22} />
        <strong>No events in this session</strong>
        <p>Use the station test controls to generate a fault and recovery.</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="event-table">
        <thead>
          <tr>
            <th>Time (UTC)</th>
            <th>Station</th>
            <th>Type</th>
            <th>Event</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {events.map((item) => (
            <tr key={`${item.stationId}-${item.id}`}>
              <td className="mono">{utc(item.at)}</td>
              <td>
                <button
                  className="text-button mono"
                  onClick={() => onSelect(item.stationId)}
                >
                  {item.stationId}
                </button>
              </td>
              <td>
                <span className={`event-type ${item.kind}`}>{item.kind}</span>
              </td>
              <td>{item.message}</td>
              <td>
                {item.acknowledged ? (
                  <span className="reviewed">
                    <Check size={12} />
                    Reviewed
                  </span>
                ) : (
                  <button
                    className="small-button"
                    onClick={() => onAcknowledge(item.stationId, item.id)}
                  >
                    Acknowledge
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
