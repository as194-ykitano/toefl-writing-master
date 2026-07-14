import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig(() => {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= "test-api-key";
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= "test.firebaseapp.com";
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= "test-project";
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "test.appspot.com";
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= "000000000000";
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= "1:000000000000:web:test";
  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      environment: "node",
      include: ["tests/**/*.test.ts"],
    },
  };
});
