---
"acdsee-classic": patch
---

Fix portrait photos with EXIF orientation rendering stretched in thumbnails,
preview and viewer. Image dimensions now report the displayed (auto-rotated)
size, and the photo renderer preserves aspect ratio so a dimension mismatch
can never skew an image again.
