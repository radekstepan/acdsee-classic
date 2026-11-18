---
"acdsee-classic": patch
---

Add a Linux launcher flow: `yarn publish:linux` packages the app, then installs
an application-menu entry and desktop icon backed by the packaged AppImage.
`yarn launcher:install` refreshes the launcher from the last package and
`yarn launcher:uninstall` removes it.
