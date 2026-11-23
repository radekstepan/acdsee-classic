---
"acdsee": patch
---

Fix Refresh (F5) leaving the folder tree stale: the parent re-list was skipped whenever it was already loaded, and merges never removed deleted folders. Refresh now force re-lists the parent and replaces its child list so new/renamed/deleted sibling folders appear.
