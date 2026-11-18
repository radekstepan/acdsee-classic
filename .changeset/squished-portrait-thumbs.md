---
"acdsee-classic": patch
---

Fix squished portrait thumbnails with wrong padding. Small OS thumbnail
requests return cover-cropped bitmaps (verified via QuickLook: a 192px
request cropped a portrait photo to 144x120, while 384px returned the full
3:4 frame), so tiles showed zoomed crops with letterbox bars. Thumbnails are
now requested large (384px+ preserves the full frame), JPEGs encode as JPEG,
and tiles size from the bitmap's own dimensions — the box always matches the
pixels, so contain fills exactly. Orientation detection stays best-effort
(flag 1-8, fallback 1) with displayed dimensions reported.
