import { useState } from "react";

const BRAND_STYLES = [
  [/merlo/i, "merlo", "MERLO"],
  [/boost/i, "boost", "BOOST"],
  [/chatime/i, "chatime", "CHATIME"],
  [/sharetea/i, "sharetea", "SHARETEA"],
  [/bookmark/i, "bookmark", "B"],
  [/brewpoint/i, "brewpoint", "BP"],
  [/nano/i, "nano", "NANO"],
  [/darwin/i, "darwin", "D"],
  [/expresso/i, "expresso", "EX"],
  [/lakeside/i, "lakeside", "L"],
  [/lightbox/i, "lightbox", "LB"],
  [/market cart/i, "market", "MC"],
  [/nunu/i, "nunu", "NU"],
  [/on a roll/i, "roll", "OAR"],
  [/saint lucy/i, "lucy", "SL"],
  [/upbeat/i, "upbeat", "UP"],
];

export default function CafeBrandMark({ cafe }) {
  const [imageFailed, setImageFailed] = useState(false);
  const brand = getBrand(cafe.name);

  return (
    <span className={`cafe-brand-mark ${brand.tone}`} aria-hidden="true">
      {cafe.imageUrl && !imageFailed ? (
        <img src={cafe.imageUrl} alt="" loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <span className={brand.label.length > 3 ? "wordmark" : "monogram"}>
          {brand.label}
        </span>
      )}
    </span>
  );
}

function getBrand(name) {
  const matchingBrand = BRAND_STYLES.find(([pattern]) => pattern.test(name));

  if (matchingBrand) {
    return { tone: matchingBrand[1], label: matchingBrand[2] };
  }

  const initials = String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return { tone: "independent", label: initials || "C" };
}
