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
  test("the Refine admin redirects anonymous visitors and displays a mocked login error", async ({ page }) => {
    await page.route(/\/auth\/v1\/token(?:\?|$)/, (route) =>
      route.fulfill({
        status: 400,
        headers: { "access-control-allow-origin": "*" },
        json: { code: "invalid_credentials", msg: "Invalid login credentials" },
      }),
    );
    await page.goto("/blog-posts");
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await page.getByRole("textbox", { name: /email/i }).fill("publish-test@example.invalid");
    await page.locator('input[type="password"]').fill("mock-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText("Invalid login credentials")).toBeVisible();
  });

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

  test("home shows public articles and a reading entry point in the selected language", async ({ page }) => {
    await page.goto("/zh");
    const chinesePosts = page.getByRole("region", { name: "近期文章" });
    await expect(chinesePosts.getByRole("link", { name: "Chocolatey" })).toHaveAttribute("href", "/zh/posts/chocolatey");
    await expect(chinesePosts.getByRole("link", { name: "全部文章" })).toHaveAttribute("href", "/zh/posts");
    await expect(page.getByRole("link", { name: "关于这个博客" })).toHaveAttribute("href", "/zh/posts/home");
    await expect(page.getByRole("main").getByText("publish: true", { exact: false })).toHaveCount(0);
    await expect(chinesePosts.getByRole("link", { name: "Quartz 中英文切换示例" })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(chinesePosts.getByRole("link", { name: "Chocolatey" })).toBeInViewport();

    await page.goto("/en");
    const englishPosts = page.getByRole("region", { name: "Start reading" });
    await expect(englishPosts.getByRole("link", { name: "One Blog", exact: true }))
      .toHaveAttribute("href", "/en/posts/home");
    await expect(englishPosts.getByRole("link", { name: "Chocolatey" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Knowledge base", exact: true }))
      .toHaveAttribute("href", process.env.NEXT_PUBLIC_PEER_SITE_URL!);

    await englishPosts.getByRole("link", { name: "All posts" }).click();
    await expect(page.getByRole("link", { name: "Quartz Chinese–English Switching Example" }))
      .toHaveAttribute("href", "/en/posts/quartz-i18n-example");
  });

  test("RSS serves both languages and keeps the default feed in Chinese", async ({ request }) => {
    const [zh, en, defaultFeed] = await Promise.all([
      request.get("/zh/rss.xml"),
      request.get("/en/rss.xml"),
      request.get("/rss.xml"),
    ]);
    for (const feed of [zh, en, defaultFeed]) {
      await expect(feed).toBeOK();
      expect(feed.headers()["content-type"]).toContain("application/rss+xml");
    }
    const [chineseXml, englishXml] = await Promise.all([zh.text(), en.text()]);
    expect(chineseXml).toContain("<language>zh-CN</language>");
    expect(chineseXml).toContain("<title>Chocolatey</title>");
    expect(englishXml).toContain("<language>en-US</language>");
    expect(englishXml).not.toContain("<title>Chocolatey</title>");
    expect(await defaultFeed.text()).toBe(chineseXml);
  });

  test("Chinese-only Chocolatey falls back with a notice and never enters English posts", async ({ page }) => {
    await page.goto("/zh/posts/chocolatey");
    await expect(page.getByRole("heading", { level: 1, name: "Chocolatey" }).first()).toBeVisible();

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", `${test.info().project.use.baseURL}/zh/posts/chocolatey`);

    const footer = page.getByRole("contentinfo");
    const friend = footer.getByRole("link", { name: "知识库", exact: true });
    await expect(friend).toHaveAttribute("href", process.env.NEXT_PUBLIC_PEER_SITE_URL!);
    await expect(friend).toHaveAttribute("rel", "friend noopener noreferrer");
    await expect(friend).toHaveAttribute("target", "_blank");

    const languageNavigation = page.getByRole("navigation", { name: "切换语言" });
    const language = languageNavigation.getByRole("link", { name: "English" });
    await expect(languageNavigation.locator('[aria-current="page"]')).toHaveText("中");
    await expect(language).toHaveText("EN");
    await expect(language).toHaveAttribute("href", "/en?translation=missing&from=chocolatey");
    await expect(page.locator("header").getByRole("link", { name: "知识库", exact: true })).toHaveCount(0);

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
