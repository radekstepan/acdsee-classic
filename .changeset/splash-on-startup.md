---
"acdsee": patch
---

Add an instant splash screen: a frameless About-styled window (logo, title, crawling progress bar) shown by the main process at startup, covering the ~3s gap while the renderer bundle boots and the first folder listing resolves. Closes when the main window is ready.
