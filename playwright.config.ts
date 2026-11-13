import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/mobile",
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", locale: "pt-BR", screenshot: "only-on-failure" },
  projects: [320, 360, 390, 430].flatMap((width) =>
    (["light", "dark"] as const).map((colorScheme) => ({
      name: `${width}-${colorScheme}`,
      use: { browserName: "chromium" as const, viewport: { width, height: 844 }, isMobile: true, hasTouch: true, colorScheme, reducedMotion: "reduce" as const },
    })),
  ),
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
