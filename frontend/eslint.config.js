import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        URL: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        DOMException: "readonly",
        AbortController: "readonly",
        console: "readonly",
        requestAnimationFrame: "readonly",
        BeforeUnloadEvent: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        ResizeObserver: "readonly",
        MouseEvent: "readonly",
        PointerEvent: "readonly",
        DOMRect: "readonly",
        RequestInfo: "readonly",
        RequestInit: "readonly",
      },
    },
  },
);
