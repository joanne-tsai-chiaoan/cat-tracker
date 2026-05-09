// Long-press action sheet — fires exactly once, closes cleanly

const LONG_PRESS_DELAY = 600; // slightly above the 550ms threshold

// Seed one meal log so there's always a card to press
function seedLog() {
  cy.window().then((win) => {
    const key = (k) => `cat-tracker-${k}`;
    const foods = [{ id: "f1", name: "Test Food", type: "wet", subtype: "pate", kcalPer100g: 100, proteinPer100g: 10, waterPer100g: 70 }];
    const logs  = [{
      id: "log1", kind: "meal", date: new Date().toISOString().slice(0, 10),
      mealType: "breakfast", createdAt: new Date().toISOString(),
      items: [{ foodId: "f1", foodName: "Test Food", foodType: "wet", grams: 50, kcal: 50, protein: 5, waterFromFood: 35 }],
      totalKcal: 50, totalProtein: 5, totalWater: 35, totalWaterFromFood: 35, extraWaterMl: 0,
    }];
    win.localStorage.setItem(key("foods"), JSON.stringify(foods));
    win.localStorage.setItem(key("logs"),  JSON.stringify(logs));
  });
}

describe("Long-press action sheet", () => {
  beforeEach(() => {
    cy.visit("/");
    seedLog();
    cy.reload();
    cy.get(".log-card").should("exist");
  });

  it("opens exactly once on long press (timer path)", () => {
    cy.get(".log-card").first()
      .trigger("touchstart", { touches: [{ clientX: 100, clientY: 100 }], changedTouches: [{ clientX: 100, clientY: 100 }] })
      .wait(LONG_PRESS_DELAY)
      .trigger("touchend", { touches: [], changedTouches: [{ clientX: 100, clientY: 100 }] });

    cy.get(".action-sheet").should("exist");
    // Wait to confirm it does NOT disappear and reappear
    cy.wait(300);
    cy.get(".action-sheet").should("exist");
    // Only one action sheet in the DOM
    cy.get(".action-sheet").should("have.length", 1);
  });

  it("opens exactly once via contextmenu (desktop path)", () => {
    cy.get(".log-card").first().trigger("contextmenu");

    cy.get(".action-sheet").should("exist");
    cy.wait(300); // wait past 550ms timer to confirm no double-fire
    cy.get(".action-sheet").should("have.length", 1);
  });

  it("closes cleanly and does not reopen after cancel", () => {
    cy.get(".log-card").first().trigger("contextmenu");
    cy.get(".action-sheet").should("exist");

    cy.get(".action-sheet-cancel").click();
    cy.get(".action-sheet").should("not.exist");

    // Wait past timer window to confirm it doesn't reopen
    cy.wait(300);
    cy.get(".action-sheet").should("not.exist");
  });

  it("does not open on a quick tap", () => {
    cy.get(".log-card").first()
      .trigger("touchstart", { touches: [{ clientX: 100, clientY: 100 }], changedTouches: [{ clientX: 100, clientY: 100 }] })
      .trigger("touchend",   { touches: [], changedTouches: [{ clientX: 100, clientY: 100 }] });

    cy.wait(200);
    cy.get(".action-sheet").should("not.exist");
  });
});
