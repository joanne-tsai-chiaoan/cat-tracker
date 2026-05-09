import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:4173",
    specPattern: "cypress/e2e/**/*.cy.{js,jsx}",
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
  },
});
