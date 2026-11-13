https://github.com/user-attachments/assets/6796d331-4cf8-4b79-a32d-208d5bc32768

What's New:

🧩 Grid Layout Editor: The two template rows are gone. The clock is now a small grid of **blocks** — Flip Time, Time, Date, Weather and Text — that you place and resize like widgets on a phone home screen. Up to 8 columns and 4 rows, and the editor shows the real clock while you work.

🖱️ Drag, Drop & Resize: Drag blocks to move them, pull the handles to resize them. Every block lands on the first free spot when you add it.

🔗 Groups: Drop a block onto another one and both become a group that shares one line and one look — like *date · sunset · temperature* under the flip cards. Right-click a member to move it, open its settings or take it out again.

🎨 Style Every Block: Own background and rounding, letter spacing, padding, a free offset to nudge it off the grid, and text sizes beyond 100 %. The **Whole clock** tab sets column widths, row heights and every single gap.

↩️ Undo & Redo: Ctrl+Z / Ctrl+Shift+Z for every change in the editor, plus a Preview mode without the editing aids.

🕒 Data › Time: 12- or 24-hour clock, leading zero on or off, and the date language — in one place for all blocks.

🌡️ Weather High & Low: Weather blocks can now show today's high and low besides temperature, feels like and the next sunrise / sunset.

🪟 New Settings Window: Sidebar with pages instead of one long form, a clean light theme and bundled **Inter** and **JetBrains Mono** fonts, so the clock looks the same everywhere.

🟩 New App Icon: Fliq finally has its own icon — the two flip cards from the settings window — in the taskbar, app menu and installers.

🐧 Smoother Dragging on Linux: On KDE Plasma and other layer-shell desktops, the clock now follows the pointer frame by frame — across monitors too, with a real copy of the clock instead of an outline.

🎛️ tuxhub: The tuxhub page follows the new layout: whole-clock settings, a new **Time** section and weather. The old first-line / second-line / $FLIPTIME fields are gone.

✨ Fresh Defaults: New installs start with big flip cards on top and *weekday, date · sunset · temperature* below, in JetBrains Mono.

🐛 Fixes: Exit now really ends Fliq, the sunset text updates every minute and switches to tomorrow's sunrise after sunset, and the clock is no longer rebuilt on every color or weather change.

⬆️ Upgrading from 1.x: Nothing to do. On the first start, Fliq turns your two template rows (`$FLIPTIME(...)`, `$TIME(...)`, `$WEATHER(...)`, `$TEXT(...)`) into blocks with your sizes and colors — once. Your old settings stay untouched in storage, so going back to 1.4.0 still works. Custom separator characters and the separator color are not carried over, so give the Layout page a quick look after updating.

📦 Quick Install (Fedora):
```
sudo dnf install https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/releases/download/v2.0.0/Fliq-2.0.0-1.x86_64.rpm
```
One-liners for openSUSE, Debian / Ubuntu and Windows are in the [README](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock#installation-).

📝 Tested on KDE Plasma 6 on Wayland (Fedora). Something broken on your setup? Please open an issue with your desktop and distro.

🙏 Thanks for your continued support — have fun building your own clock!
