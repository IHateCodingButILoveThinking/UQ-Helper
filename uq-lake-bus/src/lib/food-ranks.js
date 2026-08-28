const RANKS = [
  { key: "bronze", name: "Bronze", color: "#a85f3b", glow: "rgba(168,95,59,.22)" },
  { key: "silver", name: "Silver", color: "#71808e", glow: "rgba(113,128,142,.22)" },
  { key: "gold", name: "Gold", color: "#d08a16", glow: "rgba(208,138,22,.24)" },
  { key: "plat", name: "Plat", color: "#168f86", glow: "rgba(22,143,134,.23)" },
  { key: "diamond", name: "Diamond", color: "#7564d8", glow: "rgba(117,100,216,.25)" },
  { key: "aurora", name: "Aurora", color: "#d44c91", glow: "rgba(212,76,145,.25)" },
  { key: "comet", name: "Comet", color: "#3287d9", glow: "rgba(50,135,217,.25)" },
  { key: "nova", name: "Nova", color: "#ef6b38", glow: "rgba(239,107,56,.25)" },
  { key: "nebula", name: "Nebula", color: "#7a57d2", glow: "rgba(122,87,210,.27)" },
  { key: "celestial", name: "Celestial", color: "#159eaa", glow: "rgba(21,158,170,.24)" },
  { key: "mythic", name: "Mythic", color: "#bd3f6e", glow: "rgba(189,63,110,.27)" },
  { key: "eternal", name: "Eternal", color: "#6f4db7", glow: "rgba(111,77,183,.30)" },
  { key: "starlight", name: "Starlight", color: "#4f88dc", glow: "rgba(79,136,220,.29)" },
  { key: "orbit", name: "Orbit", color: "#2a9d83", glow: "rgba(42,157,131,.27)" },
  { key: "cosmic", name: "Cosmic", color: "#9b58cf", glow: "rgba(155,88,207,.3)" },
  { key: "prism", name: "Prism", color: "#e26370", glow: "rgba(226,99,112,.29)" },
  { key: "legend", name: "Legend", color: "#ba8518", glow: "rgba(186,133,24,.32)" },
];

const DIVISIONS = ["IV", "III", "II", "I"];

export function foodRankForLevel(level = 1) {
  const safeLevel = Math.max(1, Math.min(99, Number(level) || 1));
  const rankIndex = Math.min(RANKS.length - 1, Math.floor((safeLevel - 1) / 4));
  const division = rankIndex === RANKS.length - 1
    ? `Lv. ${safeLevel}`
    : DIVISIONS[(safeLevel - 1) % DIVISIONS.length];
  return { ...RANKS[rankIndex], division, label: `${RANKS[rankIndex].name} ${division}` };
}

export function foodRankStyle(rank) {
  return { "--food-rank": rank.color, "--food-rank-glow": rank.glow };
}

export function publicFoodAuthorLabel(label) {
  const rank = publicFoodRank(label);
  return rank ? `Posted by ${rank.name} user` : '';
}

export function publicFoodRank(label) {
  const value = String(label || '').trim().toLowerCase().replace(/^posted by /, '');
  const index = RANKS.findIndex((item) => value === item.name.toLowerCase() || value.startsWith(`${item.name.toLowerCase()} `));
  return index < 0 ? null : { ...RANKS[index], decorated: index >= 4 };
}
