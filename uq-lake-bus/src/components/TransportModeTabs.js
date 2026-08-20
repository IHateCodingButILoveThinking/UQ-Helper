import { motion } from "framer-motion";
import { BusFront, House, Ship, TrainFront } from "lucide-react";

const MODES = [
  { Icon: BusFront, id: "bus", label: "Bus", shortLabel: "Bus" },
  { Icon: Ship, id: "ferry", label: "Ferry", shortLabel: "Ferry" },
  { Icon: TrainFront, id: "train", label: "Train", shortLabel: "Train" },
];

export default function TransportModeTabs({ activeMode, onHome, onSelect }) {
  return (
    <div className="transport-navigation-shell">
      <motion.button
        type="button"
        className="transport-home-button"
        aria-label="Back to campus home"
        title="Back to home"
        onClick={onHome}
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        <House aria-hidden="true" />
        <span className="transport-home-label">Home</span>
      </motion.button>

      <nav
        className={`transport-mode-nav active-${activeMode}`}
        aria-label="Choose transport type"
      >
        {MODES.map(({ Icon, id, label, shortLabel }) => (
          <motion.button
            key={id}
            type="button"
            className={activeMode === id ? "active" : ""}
            aria-current={activeMode === id ? "page" : undefined}
            aria-pressed={activeMode === id}
            onClick={() => activeMode !== id && onSelect(id)}
            whileTap={{ scale: 0.96 }}
          >
            {activeMode === id ? (
              <motion.span
                className="transport-mode-active-pill"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.16,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            ) : null}
            <Icon aria-hidden="true" />
            <span className="transport-mode-label">
              <span className="transport-mode-label-full">{label}</span>
              <span className="transport-mode-label-short">{shortLabel}</span>
            </span>
          </motion.button>
        ))}
      </nav>
    </div>
  );
}
