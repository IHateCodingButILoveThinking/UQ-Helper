import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BusFront, House, Ship, TrainFront } from "lucide-react";

const MODES = [
  { Icon: BusFront, id: "bus", label: "Bus" },
  { Icon: Ship, id: "ferry", label: "Ferry" },
  { Icon: TrainFront, id: "train", label: "Train" },
];

export default function TransportModeTabs({ activeMode, onHome, onSelect }) {
  const [visualMode, setVisualMode] = useState(activeMode);

  useEffect(() => {
    setVisualMode(activeMode);
  }, [activeMode]);

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
        {MODES.map(({ Icon, id, label }) => (
          <motion.button
            key={id}
            type="button"
            className={visualMode === id ? "active" : ""}
            aria-current={activeMode === id ? "page" : undefined}
            onClick={() => {
              setVisualMode(id);
              onSelect(id);
            }}
            whileTap={{ scale: 0.96 }}
          >
            {visualMode === id ? (
              <motion.span
                className="transport-mode-active-pill"
                layoutId="transport-mode-active-pill"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 40,
                  mass: 0.52,
                }}
              />
            ) : null}
            <Icon aria-hidden="true" />
            <span className="transport-mode-label">{label}</span>
          </motion.button>
        ))}
      </nav>
    </div>
  );
}
