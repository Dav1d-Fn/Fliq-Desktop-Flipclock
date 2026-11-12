// Code style of this repo (see CLAUDE.md): Allman braces, four-space indent, double quotes.
// `npm run lint` checks, `npm run lint -- --fix` formats.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
    { ignores: ["dist", "src-tauri", "node_modules", "docs"] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.{ts,tsx,js}"],
        plugins: { "@stylistic": stylistic },
        rules: {
            "@stylistic/brace-style": ["error", "allman", { allowSingleLine: false }],
            "@stylistic/indent": ["error", 4, { SwitchCase: 1 }],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
            "@stylistic/semi": ["error", "always"],
        },
    },
);
