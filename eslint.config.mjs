import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // This rule is overly strict for data-fetching patterns where
      // useEffect + setState is the standard approach (Supabase, fetch, etc.)
      "react-hooks/set-state-in-effect": "off",
      // This rule flags ref reads in event handlers wrapped by React Hook Form's
      // handleSubmit, which is a false positive for our anti-double-submit pattern.
      "react-hooks/refs": "off",
    },
  },
]);
