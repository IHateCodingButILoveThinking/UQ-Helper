import { BusFront, Ship, TrainFront } from "lucide-react";

const MODES = [
  { Icon: BusFront, id: "bus", label: "Bus" },
  { Icon: Ship, id: "ferry", label: "Ferry" },
  { Icon: TrainFront, id: "train", label: "Train" },
];

export default function TransportModeTabs({ activeMode, onSelect }) {
  return (
    <nav className="transport-mode-nav" aria-label="Choose transport mode">
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
  );
}
