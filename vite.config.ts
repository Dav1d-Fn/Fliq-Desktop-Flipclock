import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // Options for `tauri dev` / `tauri build`:
    // keep Rust errors visible, and use the fixed port Tauri expects (fail if it is taken).
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        // The ghost windows cover whole monitors: an error overlay there blocks the desktop.
        // Errors still show in the terminal and the devtools console.
        hmr: {
            overlay: false,
        },
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        rollupOptions: {
            // One HTML entry per window: the clock, the styling window, the drag ghosts.
            input: {
                main: "index.html",
                styling: "stylingMenu.html",
                ghost: "ghost.html",
            },
        },
    },
});
