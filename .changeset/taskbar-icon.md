---
"acdsee-classic": patch
---

Show the app icon in the Windows taskbar and Linux dock/window list instead of
the default Electron icon. The window is now created with `resources/icon.png`
(shipped via `extraResources`), and the Linux package sets an explicit
`desktopName` plus `syncDesktopName` so the generated `.desktop` file's
`StartupWMClass` matches Electron's `app_id`/`WM_CLASS`.
