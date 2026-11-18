---
"acdsee": patch
---

Fix dialog tabs (e.g. Properties): the selected tab no longer has a frame line cutting it off from its panel. The tab strip no longer creates a stacking context, so the selected tab paints above the panel, with a face-colored strip covering the panel's top border within the tab's width.
