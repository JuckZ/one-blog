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

    const footer = page.getByRole("contentinfo");
    const friend = footer.getByRole("link", { name: "Quartz 版" });
    await expect(friend).toHaveAttribute("href", process.env.NEXT_PUBLIC_PEER_SITE_URL!);
    await expect(friend).toHaveAttribute("rel", "friend noopener noreferrer");
    await expect(friend).toHaveAttribute("target", "_blank");

    const languageNavigation = page.getByRole("navigation", { name: "切换语言" });
    const language = languageNavigation.getByRole("link", { name: "English" });
    await expect(languageNavigation.locator('[aria-current="page"]')).toHaveText("中");
    await expect(language).toHaveText("EN");
    await expect(language).toHaveAttribute("href", "/en?translation=missing&from=chocolatey");
    await expect(page.locator("header").getByRole("link", { name: "Quartz 版" })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    const languageBox = await language.boundingBox();
    const navigationBox = await languageNavigation.boundingBox();
    expect(languageBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(languageBox!.x).toBeGreaterThanOrEqual(0);
    expect(languageBox!.y).toBeGreaterThanOrEqual(0);
    expect(languageBox!.x + languageBox!.width).toBeLessThanOrEqual(390);
    expect(languageBox!.y + languageBox!.height).toBeLessThanOrEqual(844);
    expect(navigationBox!.width).toBeGreaterThan(100);
    expect(navigationBox!.height).toBeGreaterThanOrEqual(40);

    await friend.scrollIntoViewIfNeeded();
    const friendBox = await friend.boundingBox();
    expect(friendBox).not.toBeNull();
    expect(friendBox!.x).toBeGreaterThanOrEqual(0);
    expect(friendBox!.y).toBeGreaterThanOrEqual(0);
    expect(friendBox!.x + friendBox!.width).toBeLessThanOrEqual(390);
    expect(friendBox!.y + friendBox!.height).toBeLessThanOrEqual(844);

    await language.click();
    await expect(page).toHaveURL(/\/en\?translation=missing&from=chocolatey$/);
    await expect(page.getByRole("status")).toContainText("not available in English yet");

    await page.goto("/en/posts");
    await expect(page.getByText("Chocolatey", { exact: true })).toHaveCount(0);
  });
});
