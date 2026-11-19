---
"acdsee-classic": patch
---

Fix display-scaling follow-ups: apply UI scale through browser-level zoom on desktop so native dropdown lists open under the control, switch the pixel font to antialiased smoothing while scaled, and redraw the radio ring as a single clean outline (the stacked inset shadows collapsed into a lopsided crescent on the 12px circle) with the dot painted as a background gradient instead of an input::after pseudo.
