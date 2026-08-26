const RANKS = [
  { key: "bronze", name: "Bronze", color: "#a85f3b", glow: "rgba(168,95,59,.22)" },
  { key: "silver", name: "Silver", color: "#71808e", glow: "rgba(113,128,142,.22)" },
  { key: "gold", name: "Gold", color: "#d08a16", glow: "rgba(208,138,22,.24)" },
  { key: "plat", name: "Plat", color: "#168f86", glow: "rgba(22,143,134,.23)" },
  { key: "diamond", name: "Diamond", color: "#7564d8", glow: "rgba(117,100,216,.25)" },
  { key: "aurora", name: "Aurora", color: "#d44c91", glow: "rgba(212,76,145,.25)" },
];

const DIVISIONS = ["IV", "III", "II", "I"];

export function foodRankForLevel(level = 1) {
  const safeLevel = Math.max(1, Math.min(99, Number(level) || 1));
  const rankIndex = Math.min(RANKS.length - 1, Math.floor((safeLevel - 1) / 4));
  const division = rankIndex === RANKS.length - 1 && safeLevel >= 24
    ? "★"
    : DIVISIONS[(safeLevel - 1) % DIVISIONS.length];
  return { ...RANKS[rankIndex], division, label: `${RANKS[rankIndex].name} ${division}` };
}

export function foodRankStyle(rank) {
  return { "--food-rank": rank.color, "--food-rank-glow": rank.glow };
}
