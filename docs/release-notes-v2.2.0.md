What's New:

🧩 Drag & Drop Layout Editor: The block palette now sits above the canvas. Drag a block kind straight onto the clock to place it, or drag a block out of the clock onto the red remove target to delete it (Ctrl+Z brings it back). Moving, resizing or dropping onto taken cells shrinks the blocks in the way to make room, previewed before you let go.

✨ Animated Effects: Dot Matrix, LCD and Nixie blocks can come alive — breathing waves, sparkling dots and scan lines for Dot Matrix, backlight flicker, ghost segments and scan lines for LCD, glow pulse, flicker and warm-up for Nixie. Each effect has its own speed, strength and variants (wave direction, scan direction, per tube or all together, warm-up with or without afterglow). Off by default, and off when your system asks for reduced motion.

🌙 Dark Mode: The settings window has a light, dark or system theme under **General › Appearance**, with neutral greys and its own title bar that follows the theme. The clock itself is unchanged.

🎨 Grouped Settings: Settings that belong together — an effect with its speed and strength, a background with its color and rounding, font and text color, and more — are framed together in the inspector.

📐 Bigger Grids: Up to 24 rows and 24 columns instead of 4 × 8. The row stepper now sits at the right edge and the column stepper above the clock.

🐛 Fixes: Removing a row works again — it takes an empty row if there is one, otherwise the last row (blocks reaching into it get shorter, Ctrl+Z undoes it).

⬆️ Upgrading from 2.1: Nothing to do. Your layouts look exactly as before; effects stay off until you pick one.

📦 Quick Install (Fedora):
```
sudo dnf install https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock/releases/download/v2.2.0/Fliq-2.2.0-1.x86_64.rpm
```
One-liners for openSUSE, Debian / Ubuntu and Windows are in the [README](https://github.com/Dav1d-Fn/Fliq-Desktop-Flipclock#installation-).

📝 Tested on KDE Plasma 6 on Wayland (Fedora). Something broken on your setup? Please open an issue with your desktop and distro.
