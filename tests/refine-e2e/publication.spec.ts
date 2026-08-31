import { expect, test, type Page } from "@playwright/test";

async function navigateRoot(page: Page, expectedLocale: "zh" | "en") {
  try {
    await page.goto("/", { waitUntil: "commit" });
  } catch (error) {
    if (!String(error).includes("ERR_ABORTED")) throw error;
  }
  await expect(page).toHaveURL(new RegExp(`/${expectedLocale}$`));
}

test.describe("Next and Refine bilingual publication", () => {
  test("root negotiates browser language and gives Cookie priority", async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required");
    const context = await browser.newContext({ baseURL, locale: "zh-CN" });
    try {
      const page = await context.newPage();
      await navigateRoot(page, "zh");

      await context.addCookies([
        { name: "one-blog-lang", value: "en", url: baseURL },
      ]);
      await navigateRoot(page, "en");
    } finally {
      await context.close();
    }
  });

  test("Chinese-only Chocolatey falls back with a notice and never enters English posts", async ({ page }) => {
    await page.goto("/zh/posts/chocolatey");
    await expect(page.getByRole("heading", { level: 1, name: "Chocolatey" }).first()).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", `${test.info().project.use.baseURL}/zh/posts/chocolatey`);

    const friend = page.getByRole("link", { name: "Quartz 版" });
    await expect(friend).toHaveAttribute("href", process.env.NEXT_PUBLIC_PEER_SITE_URL!);
    await expect(friend).toHaveAttribute("rel", "friend noopener noreferrer");
    await expect(friend).toHaveAttribute("target", "_blank");

    const language = page.getByRole("link", { name: "切换语言" });
    await expect(language).toHaveAttribute("href", "/en?translation=missing&from=chocolatey");

    await page.setViewportSize({ width: 390, height: 844 });
    const [friendBox, languageBox] = await Promise.all([friend.boundingBox(), language.boundingBox()]);
    expect(friendBox).not.toBeNull();
    expect(languageBox).not.toBeNull();
    for (const box of [friendBox!, languageBox!]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
    }
    const overlapWidth = Math.min(friendBox!.x + friendBox!.width, languageBox!.x + languageBox!.width)
      - Math.max(friendBox!.x, languageBox!.x);
    const overlapHeight = Math.min(friendBox!.y + friendBox!.height, languageBox!.y + languageBox!.height)
      - Math.max(friendBox!.y, languageBox!.y);
    expect(overlapWidth > 0 && overlapHeight > 0).toBe(false);

    await language.click();
    await expect(page).toHaveURL(/\/en\?translation=missing&from=chocolatey$/);
    await expect(page.getByRole("status")).toContainText("not available in English yet");

    await page.goto("/en/posts");
    await expect(page.getByText("Chocolatey", { exact: true })).toHaveCount(0);
  });
});
