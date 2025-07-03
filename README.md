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

- 🐧 **Linux & macOS Support**
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
