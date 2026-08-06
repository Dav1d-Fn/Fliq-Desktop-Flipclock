# Fliq – A Floating Desktop Flipclock ⏳

<div align="center">
  <img src="https://github.com/Dav1d-Fn/desktop-flipclock/assets/28605357/ba2a5423-5064-40f9-94a0-5d2849336b0a" alt="Flipclock GIF">
</div>

---

## Overview 📋

**Fliq** is a sleek, customizable desktop clock that displays the current time in a retro flip clock style.  
Built with [React](https://reactjs.org/) and [Tauri v2](https://v2.tauri.app/), it's fast, lightweight, and privacy-friendly.

---

## Features ✨

- 🖌️ **Fully Customizable Layout** via Template Tags  
  Combine dynamic elements using intuitive placeholders:
  - `$TIME(HH:mm:ss)` – classic digital time
  - `$FLIPTIME(HH:mm)` – retro flip clock style
  - `$WEATHER(tempEmoji)` – weather info with emoji and temperature
  - `$TEXT(My custom text)` – static custom text
  - `$WEATHER(nextSun)` – next sunrise or sunset with time

- 🌍 **Multilingual Interface**  
  Switch between:
  - English, Deutsch, Français, Español, Italiano, Русский, 中文, 日本語, Svenska, Polski  
  Don't see your language? [Open an issue](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/issues) or contribute a translation – it's always welcome!

- 🌤️ **Weather & Sun Data**  
  - Live weather info via [wttr.in](https://wttr.in)
  - Sunrise and sunset times via [sunrisesunset.io](https://sunrisesunset.io/api/)
  - Updates automatically in the background

- ⚙️ **Additional Settings**  
  - Font selection (from system fonts)
  - Customizable font size, spacing, border radius, and background
  - Autostart on system boot
  - Hide from taskbar
  - Always-on-top toggle

---

## Installation 💻

### Windows 🪟

1. Download the latest `.exe` installer from the [Releases](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/releases) page.
2. Run the installer and follow the on-screen instructions.

### Linux 🐧

Download the matching package from the [Releases](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/releases) page, then:

| Distro | Command |
|---|---|
| Fedora | `sudo dnf install ./Fliq*.rpm` |
| openSUSE | `sudo zypper install ./Fliq*.rpm` |
| Debian / Ubuntu / Mint | `sudo apt install ./Fliq*.deb` |
| Arch | no AUR package — use the `.AppImage`: `chmod +x Fliq*.AppImage && ./Fliq*.AppImage` |
| Anything else | `.AppImage`: `chmod +x Fliq*.AppImage && ./Fliq*.AppImage` |

#### What works where

Wayland does not let an application keep itself on top by itself. Fliq therefore picks one
of two modes at startup, and what you get depends on your desktop:

| Desktop | Frameless & transparent | Above normal windows | Above fullscreen games |
|---|---|---|---|
| KDE Plasma (Wayland) | ✅ | ✅ | ✅ |
| Sway / Hyprland | ✅ | ✅ | ✅ |
| GNOME (Wayland) | ✅ | ✅ | ❌ |
| Any X11 session | ✅ | ✅ | ❌ |

Above fullscreen requires the `wlr-layer-shell` protocol, which KDE Plasma, Sway, Hyprland and
other wlroots-based compositors implement. **GNOME does not implement it and has stated it will
not**, so on GNOME — and on any X11 session — the clock stays above normal windows but not
above fullscreen ones.

A few other things worth knowing:

- **Dragging on Wayland** feels less smooth than dragging a normal window. The drag outline is
  drawn by a webview whose frame clock is capped at ~62 Hz regardless of the monitor's refresh
  rate (measured: 164.87 Hz on the test machine), and the position travels through the app
  instead of being handled by the compositor directly. This is a property of WebKitGTK, not a
  misconfiguration — it can't be fixed from the application.
- **Multi-monitor:** the clock can be dragged to any monitor. The drag outline itself is only
  drawn on up to **8 monitors** — beyond that, dragging still works, just without a preview on
  the extra screens. A monitor plugged in while Fliq is already running gets no outline until
  restart.
- **X11 compatibility mode** has no drag outline at all — dragging is handled by the window
  manager directly, same as on Windows.
- If auto-detection picks the wrong mode, override it under **Styling → General Settings →
  Overlay Mode** (takes effect after a restart).

Only **KDE Plasma 6.7.3 on Wayland** has actually been tested. GNOME, XFCE, Cinnamon, Sway,
Hyprland, X11 sessions, and every distro other than Fedora are expected to work but untested.
If something's broken on your setup, please [open an issue](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/issues)
with your desktop and distro.

#### Building from source

```bash
# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel gtk-layer-shell-devel libappindicator-gtk3-devel librsvg2-devel patchelf

# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libgtk-layer-shell-dev libayatana-appindicator3-dev librsvg2-dev patchelf

npm install
npm run tauri build
```

---

## Example Templates 🧩

```
$FLIPTIME(HH:mm) $TEXT(—) $WEATHER(tempEmoji)
```

---

## Dependencies 📦

Fliq is built on the shoulders of great open-source projects:

- [pqina/flip](https://github.com/pqina/flip) – Lightweight JavaScript flip animations.
- [Day.js](https://github.com/iamkun/dayjs) – Fast, modern alternative to Moment.js.
- [Mantine](https://github.com/mantinedev/mantine) – Modern React UI components.
- [Jotai](https://github.com/pmndrs/jotai) – Minimalist global state management.
- [wttr.in](https://github.com/chubin/wttr.in) – Weather data via HTTP (no API key required).
- [sunrisesunset.io](https://sunrisesunset.io/api/) – Free sunrise & sunset time API.

---

## Upcoming Updates 🛠️

Here’s a glimpse at what’s coming:

- ~~🐧 **Linux Support**~~ — done
- ~~🍎 **macOS Support**~~ — no Mac to build or test on, don't count on this happening
- 🎨 **Additional Clock Styles** and layouts
- 📅 **Calendar Integration** – events & reminders
- ✅ **Task Support** – simple to-dos directly on the clock

---

## Donations 💖

If you enjoy using Fliq and want to support its development, you can buy me a coffee:

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/davidfn)

---

## Feedback & Contributions

Found a bug or have a feature idea?  
Feel free to [open an issue](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/issues) or reach out!

---

Thank you for using Fliq 🙌 
