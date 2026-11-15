import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds Fliq's settings page for tuxhub (`npm run build:tuxhub`) into its own folder. The
// Linux packages ship that folder as plain files, because tuxhub loads the page from disk
// (`tool://fliq/tuxhub.html`), not from the app binary. Relative paths, so the folder works
// wherever it is installed.
export default defineConfig({
    plugins: [react()],
    base: "./",
    build: {
        outDir: "dist-tuxhub",
        emptyOutDir: true,
        rollupOptions: {
            input: "tuxhub.html",
        },
    },
});
