import { expect, test } from "@playwright/test";

/**
 * The loop that matters: load -> preset -> run -> prediction -> history -> replay.
 */
test("runs an inference and replays it from history", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await expect(page.getByRole("button", { name: /run inference/i })).toBeEnabled();

  const submitBtn = page.locator("button[type='submit']");
  await submitBtn.click();

  await expect(page.getByText("Iris-setosa").first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 });

  await page.getByRole("tab", { name: /history/i }).click();
  const entry = page.getByRole("button", { name: /replay inference/i }).first();
  await expect(entry).toBeVisible();
  await expect(entry).toBeEnabled({ timeout: 10_000 });

  await entry.click();
  await expect(page.getByText("Iris-setosa").first()).toBeVisible({ timeout: 15_000 });
});

test("rejects values outside the hard limits", async ({ page }) => {
  await page.goto("/");
  const field = page.getByRole("spinbutton", { name: /sepal length/i });
  await field.fill("42");
  await expect(page.getByText(/must be at most 10 cm/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /run inference/i })).toBeDisabled();
});

test("stays usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /run inference/i })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
});

test("switches cleanly across all five datasets and runs inference", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");

  // Enable 2x speed for fast test execution
  await page.getByRole("radio", { name: "2×" }).click();

  const selector = page.locator("select");
  await expect(selector).toBeVisible();

  // 1. Iris
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("Iris-setosa").first()).toBeVisible({ timeout: 10_000 });

  // 2. Wine
  await selector.selectOption("wine");
  await expect(page.getByText(/13 → 16 → 10 → 3/i)).toBeVisible({ timeout: 10_000 });
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("Class 1").or(page.getByText("Class 2")).or(page.getByText("Class 3")).first()).toBeVisible({ timeout: 10_000 });

  // 3. Digits
  await selector.selectOption("digits");
  await expect(page.getByText(/8 → 16 → 12 → 10/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Handwritten Digit Samples (0-9)")).toBeVisible();
  await page.getByRole("button", { name: "7" }).click();
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("7").first()).toBeVisible({ timeout: 10_000 });

  // 4. Two-Moons
  await selector.selectOption("moons");
  await expect(page.getByText(/2 → 8 → 8 → 2/i)).toBeVisible({ timeout: 10_000 });
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("Moon A").or(page.getByText("Moon B")).first()).toBeVisible({ timeout: 10_000 });

  // 5. Concentric Circles
  await selector.selectOption("circles");
  await expect(page.getByText(/2 → 8 → 8 → 2/i)).toBeVisible({ timeout: 10_000 });
  await page.locator("button[type='submit']").click();
  await expect(page.getByText("Inner Circle").or(page.getByText("Outer Circle")).first()).toBeVisible({ timeout: 10_000 });
});
