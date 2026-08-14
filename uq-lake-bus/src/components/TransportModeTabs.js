import { BusFront, House, Ship, TrainFront } from "lucide-react";

const MODES = [
  { Icon: BusFront, id: "bus", label: "Bus" },
  { Icon: Ship, id: "ferry", label: "Ferry" },
  { Icon: TrainFront, id: "train", label: "Train" },
];

export default function TransportModeTabs({ activeMode, onHome, onSelect }) {
  return (
    <div className="transport-navigation-shell">
      <button
        type="button"
        className="transport-home-button"
        aria-label="Back to campus home"
        title="Back to home"
        onClick={onHome}
      >
        <House aria-hidden="true" />
        <span className="transport-home-label">Home</span>
      </button>

      <nav
        className={`transport-mode-nav active-${activeMode}`}
        aria-label="Choose transport type"
      >
        {MODES.map(({ Icon, id, label }) => (
          <button
            key={id}
            type="button"
            className={activeMode === id ? "active" : ""}
            aria-current={activeMode === id ? "page" : undefined}
            onClick={() => onSelect(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
