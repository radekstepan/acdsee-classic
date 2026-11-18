---
"acdsee-classic": patch
---

Fix portrait photos with EXIF orientation rendering stretched in thumbnails,
preview and viewer. Image dimensions now report the displayed (auto-rotated)
size, thumbnails are counter-rotated in the main process (Electron's
thumbnailer ignores EXIF), and the photo renderer preserves aspect ratio so
a dimension mismatch can never skew an image again.
