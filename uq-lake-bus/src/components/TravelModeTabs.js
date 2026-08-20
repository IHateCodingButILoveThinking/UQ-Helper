import { motion } from "framer-motion";
import { House, Palmtree, Plane } from "lucide-react";

const TRIPS = [
  { Icon: Palmtree, id: "gold-coast", label: "Gold Coast" },
  { Icon: Plane, id: "airport", label: "Airport" },
];

export default function TravelModeTabs({ activeMode, onHome, onSelect }) {
  return (
    <div className="trip-navigation-shell">
      <motion.button type="button" className="trip-home-button" aria-label="Back to campus home" onClick={onHome} whileTap={{ scale: 0.94 }}>
        <House aria-hidden="true" />
      </motion.button>
      <nav className="trip-mode-nav" aria-label="Choose a trip">
        {TRIPS.map(({ Icon, id, label }) => (
          <motion.button key={id} type="button" className={activeMode === id ? `active ${id}` : id} aria-current={activeMode === id ? "page" : undefined} aria-pressed={activeMode === id} onClick={() => activeMode !== id && onSelect(id)} whileTap={{ scale: 0.96 }}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </motion.button>
        ))}
      </nav>
    </div>
  );
}
