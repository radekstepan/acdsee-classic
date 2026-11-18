import { useEffect, useState } from "react";
import { demoPhotoUrl } from "../data/catalog";

const STEPS = [
  "Initializing...",
  "Loading JPEG codec...",
  "Loading GIF / PNG codecs...",
  "Reading folder tree...",
  "Building thumbnail cache...",
  "Starting ACDSee...",
];

export function Splash({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step >= STEPS.length) {
      const t = setTimeout(onDone, 150);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), 330);
    return () => clearTimeout(t);
  }, [step, onDone]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 20000, background: "rgba(0,0,0,0)" }} onMouseDown={onDone}>
      <div
        className="relative overflow-hidden"
        style={{
          width: 460,
          height: 270,
          background: "linear-gradient(135deg, #0a1a5c 0%, #1b4fb0 55%, #5aa0e8 100%)",
          border: "1px solid #000",
          boxShadow: "inset 0 0 0 1px #8ab4f0, 4px 4px 0 rgba(0,0,0,.45)",
          color: "#fff",
        }}
      >
        {/* decorative rays */}
        <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(115deg, rgba(255,255,255,.05) 0 14px, rgba(255,255,255,0) 14px 34px)" }} />
        {/* lens */}
        <div className="absolute" style={{ left: 28, top: 34, width: 124, height: 124 }}>
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: "7px solid #e8eef8", boxShadow: "0 0 0 2px #1a2a60, inset 0 0 0 2px #7a8aa8" }}>
            <img src={demoPhotoUrl(7)} alt="" className="w-full h-full object-cover" style={{ maxWidth: "none" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,.55), rgba(255,255,255,0) 45%)" }} />
          </div>
          <div className="absolute" style={{ left: 96, top: 108, width: 56, height: 14, background: "linear-gradient(#b0703a,#6a3a14)", transform: "rotate(45deg)", transformOrigin: "left center", borderRadius: 7, boxShadow: "0 0 0 2px #1a2a60" }} />
        </div>
        <div className="absolute" style={{ left: 172, top: 50 }}>
          <div style={{ fontFamily: "Arial Black, Arial, sans-serif", fontWeight: 900, fontStyle: "italic", fontSize: 50, letterSpacing: -1, textShadow: "3px 3px 0 #0a1a5c", lineHeight: "52px" }}>
            ACD<span style={{ color: "#ffe35a" }}>See</span>
            <span style={{ fontSize: 18, verticalAlign: "top", marginLeft: 4, fontStyle: "normal", fontWeight: 700 }}>3.1</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 6, fontFamily: "Arial, sans-serif", fontStyle: "italic", textShadow: "1px 1px 0 #0a1a5c" }}>The world's most popular image browser &amp; viewer</div>
        </div>
        <div className="absolute left-5 right-5" style={{ top: 178, fontFamily: "W98, Arial", fontSize: 11 }}>
          <div className="mb-1" style={{ textShadow: "1px 1px 0 #0a1a5c" }}>{STEPS[Math.min(step, STEPS.length - 1)]}</div>
          <div className="progress" style={{ height: 16 }}>
            <div style={{ width: `${Math.min(100, (step / STEPS.length) * 100)}%`, transition: "width .3s linear" }} />
          </div>
        </div>
        <div className="absolute left-5 right-5 bottom-3 flex justify-between" style={{ fontSize: 10, fontFamily: "Arial, sans-serif", color: "#cfe0ff" }}>
          <span>Copyright © 1994-1999 ACD Systems Ltd. All rights reserved.</span>
          <span>Evaluation Copy</span>
        </div>
      </div>
    </div>
  );
}
