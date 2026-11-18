---
"acdsee-classic": patch
---

Make the viewer's full screen real. Enter now switches the actual OS window to
full screen, so the Linux panel, Windows taskbar or macOS menu bar/dock is out
of the way instead of the image merely filling the app window. Pressing Enter
again leaves full screen cleanly; the windowed size is kept, and leaving full
screen through the window manager is mirrored back into the viewer.

The viewer also claims its keys before the browser pane behind it. That pane
often keeps keyboard focus while the viewer is open, so Enter used to both
leave full screen and re-open the viewer in the same keypress — the visible
flicker that kept the app full screen.
