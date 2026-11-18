---
"acdsee-classic": minor
---

Remember the app between runs. Settings, view mode, sort/filter, the expanded
folder tree, pane sizes, the Back/Forward trail and the last folder are saved to
a hidden `~/.acdsee/state.json` and restored on launch; the window size, position
and maximized state live in `~/.acdsee/window.json`. A remembered folder is
re-opened even when its parent chain was never listed, and a missing or corrupt
state file falls back to the classic defaults. The web demo uses localStorage.
