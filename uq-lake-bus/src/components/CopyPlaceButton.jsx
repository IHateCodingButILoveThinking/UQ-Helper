import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import "../styles/copy-place.css";

export default function CopyPlaceButton({ text, label = "Copy place" }) {
  const [status, setStatus] = useState("");
  const buttonRef = useRef(null);
  const timerRef = useRef(null);
  const requestRef = useRef(0);
  useEffect(() => {
    setStatus("");
    return () => {
      requestRef.current += 1;
      clearTimeout(timerRef.current);
    };
  }, [text]);

  const copy = async () => {
    const value = String(text || "").trim();
    if (!value) return;
    const request = ++requestRef.current;
    clearTimeout(timerRef.current);
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch { /* Older browsers/denied clipboard API: try the selection fallback. */ }
    if (request !== requestRef.current) return;
    if (!copied) {
      const field = document.createElement("textarea");
      field.value = value;
      field.readOnly = true;
      field.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none";
      // Stay inside the current dialog's focus trap and avoid opening the keyboard.
      buttonRef.current?.parentElement?.appendChild(field);
      try {
        field.focus({ preventScroll: true });
        field.select();
        field.setSelectionRange(0, value.length);
        copied = document.execCommand("copy");
      } catch { copied = false; }
      finally {
        field.remove();
        buttonRef.current?.focus({ preventScroll: true });
      }
    }
    setStatus(copied ? "copied" : "failed");
    timerRef.current = setTimeout(() => setStatus(""), copied ? 2000 : 4000);
  };

  return <button ref={buttonRef} type="button" className="food-copy-place" disabled={!String(text || "").trim()}
    onClick={copy} aria-label={status === "copied" ? "Copied" : label}
    title={status === "failed" ? "Clipboard unavailable. Select the result text to copy it manually." : label}>
    {status === "copied" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    <span role="status">{status === "copied" ? "Copied" : status === "failed" ? "Can't copy" : "Copy"}</span>
  </button>;
}
