---
"acdsee": patch
---

Fix the desktop Recycle Bin view showing "No images in this folder" while the OS trash contains images. Add an `acdsee:list-trash` channel (Trash/files on Linux, ~/.Trash on macOS) and load it when navigating to the Recycle Bin, including thumbnails, metadata, hidden-file filtering, and refresh.
