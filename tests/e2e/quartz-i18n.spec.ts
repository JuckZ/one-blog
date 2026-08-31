import { expect, test, type APIResponse, type Page } from "@playwright/test";

type ContentIndex = Record<string, { title: string; slug?: string; links?: string[] }>;

function redirectPath(response: APIResponse): string {
  const location = response.headers().location;
  expect(location).toBeTruthy();
  return new URL(location!, "http://one-blog.test").pathname;
}

function expectEnglishTitles(titles: string[]) {
  expect(titles).toContain("One Blog");
  expect(titles).toContain("Quartz Chinese–English Switching Example");
  expect(titles.some((title) => /[\u3400-\u9fff]/u.test(title))).toBe(false);
}

async function expectLocalizedInternalLinks(page: Page, locale: "zh" | "en") {
  const invalidPaths = await page.locator("a[href]").evaluateAll((links, currentLocale) => {
    return links.flatMap((element) => {
      const link = element as HTMLAnchorElement;
      if (link.closest("#one-blog-language-switcher")) return [];
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return [];
      return url.pathname === `/${currentLocale}` || url.pathname.startsWith(`/${currentLocale}/`)
        ? []
        : [url.pathname];
    });
  }, locale);
  expect(invalidPaths).toEqual([]);
}

test.describe("Quartz bilingual publication", () => {
  test("root redirect negotiates Accept-Language and gives Cookie priority", async ({ request }) => {
    const chinese = await request.get("/", {
      headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" },
      maxRedirects: 0,
    });
    expect(chinese.status()).toBe(307);
    expect(redirectPath(chinese)).toBe("/zh");

    const english = await request.get("/", {
      headers: { "Accept-Language": "en-US,en;q=0.9,zh;q=0.8" },
      maxRedirects: 0,
    });
    expect(english.status()).toBe(307);
    expect(redirectPath(english)).toBe("/en");

    const englishCookie = await request.get("/", {
      headers: { "Accept-Language": "zh-CN", Cookie: "one-blog-lang=en" },
      maxRedirects: 0,
    });
    expect(redirectPath(englishCookie)).toBe("/en");

    const chineseCookie = await request.get("/", {
      headers: { "Accept-Language": "en-US", Cookie: "one-blog-lang=zh" },
      maxRedirects: 0,
    });
    expect(redirectPath(chineseCookie)).toBe("/zh");
  });

  test("home and paired article switch language with a full reload and persist preference", async ({ page }) => {
    await page.goto("/zh");
    await expect(page.getByRole("heading", { level: 1, name: "One Blog" }).first()).toBeVisible();
    await page.getByRole("navigation", { name: "切换语言" }).getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);

    await expect.poll(async () => {
      const cookie = (await page.context().cookies()).find((candidate) => candidate.name === "one-blog-lang");
      return cookie?.value;
    }).toBe("en");
    expect(await page.evaluate(() => localStorage.getItem("one-blog-lang"))).toBe("en");

    await page.reload();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);

    await page.getByRole("link", { name: "Quartz Chinese–English switching example", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/projects\/blog\/quartz-i18n-example$/);
    await page.evaluate(() => { (window as typeof window & { __oneBlogSentinel?: string }).__oneBlogSentinel = "english"; });

    await page.getByRole("navigation", { name: "Switch language" }).getByRole("link", { name: "中文" }).click();
    await expect(page).toHaveURL(/\/zh\/projects\/blog\/quartz-i18n-example$/);
    await expect(page).toHaveTitle("Quartz 中英文切换示例");
    expect(await page.evaluate(() => (window as typeof window & { __oneBlogSentinel?: string }).__oneBlogSentinel)).toBeUndefined();
    await expect(page.locator(".explorer")).toContainText("Quartz 中英文切换示例");

    await page.getByRole("navigation", { name: "切换语言" }).getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/projects\/blog\/quartz-i18n-example$/);
    const englishIndexTitles = await page.evaluate(async () => {
      const index = await eval("fetchData") as ContentIndex;
      return Object.values(index).map((entry) => entry.title);
    });
    expectEnglishTitles(englishIndexTitles);
  });

  test("English Search, Explorer, Graph and Backlinks share an English-only index", async ({ page, request }) => {
    const indexResponse = await request.get("/en/static/contentIndex.json");
    expect(indexResponse.ok()).toBe(true);
    const index = await indexResponse.json() as ContentIndex;
    const indexTitles = Object.values(index).map((entry) => entry.title);
    expectEnglishTitles(indexTitles);

    await page.goto("/en");
    await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Graph View" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Backlinks" })).toBeVisible();
    await expect(page.locator(".explorer")).not.toContainText("Quartz 中英文切换示例");
    await expect(page.locator(".backlinks")).toContainText("Quartz Chinese–English Switching Example");
    await expect(page.locator(".backlinks")).not.toContainText("Quartz 中英文切换示例");
    await expect(page.locator(".global-graph-container")).toBeAttached();

    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("textbox", { name: "Search for something..." }).fill("Quartz");
    const resultTitles = await page.getByRole("listbox", { name: "Search results" })
      .getByRole("heading")
      .allTextContents();
    expect(resultTitles).toContain("Quartz Chinese–English Switching Example");
    expect(resultTitles.some((title) => /[\u3400-\u9fff]/u.test(title))).toBe(false);
  });

  test("Chinese-only Chocolatey stays out of English indexes and falls back with a notice", async ({ page, request }) => {
    const chineseIndexResponse = await request.get("/zh/static/contentIndex.json");
    const englishIndexResponse = await request.get("/en/static/contentIndex.json");
    expect(chineseIndexResponse.ok()).toBe(true);
    expect(englishIndexResponse.ok()).toBe(true);
    expect(await chineseIndexResponse.text()).toContain("Chocolatey");
    expect(await englishIndexResponse.text()).not.toContain("Chocolatey");

    await page.goto("/zh/areas/os/chocolatey");
    await expect(page.getByRole("heading", { level: 1, name: "Chocolatey" }).first()).toBeVisible();
    const englishSwitch = page.getByRole("navigation", { name: "切换语言" })
      .getByRole("link", { name: "English" });
    await expect(englishSwitch).toHaveAttribute("href", "/en?translation=missing&from=chocolatey");
    await englishSwitch.click();
    await expect(page).toHaveURL(/\/en\?translation=missing&from=chocolatey$/);
    await expect(page.locator("#one-blog-translation-notice")).toContainText(
      "This article is not available in English yet",
    );
  });

  test("all generated internal links retain the active locale", async ({ page }) => {
    await page.goto("/en");
    await expectLocalizedInternalLinks(page, "en");
    await page.goto("/en/projects/blog/quartz-i18n-example");
    await expectLocalizedInternalLinks(page, "en");

    await page.goto("/zh");
    await expectLocalizedInternalLinks(page, "zh");
    await page.goto("/zh/projects/blog/quartz-i18n-example");
    await expectLocalizedInternalLinks(page, "zh");
  });

  test("mobile language control stays usable while the friend link remains in the footer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/zh");
    const footer = page.locator("footer");
    const friend = footer.getByRole("link", { name: "Refine 版" });
    const languageNavigation = page.getByRole("navigation", { name: "切换语言" });
    const switcher = languageNavigation.getByRole("link", { name: "English" });
    await expect(friend).toBeVisible();
    await expect(switcher).toBeVisible();
    await expect(languageNavigation.locator('[aria-current="page"]')).toHaveText("中");
    await expect(switcher).toHaveText("EN");
    await expect(page.locator(".left.sidebar .flex-component > #one-blog-language-switcher")).toHaveCount(1);
    await expect(languageNavigation).toHaveCSS("position", "static");
    const initialSwitcherBox = await switcher.boundingBox();
    const navigationBox = await languageNavigation.boundingBox();
    expect(initialSwitcherBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(initialSwitcherBox!.x).toBeGreaterThanOrEqual(0);
    expect(initialSwitcherBox!.y).toBeGreaterThanOrEqual(0);
    expect(initialSwitcherBox!.x + initialSwitcherBox!.width).toBeLessThanOrEqual(390);
    expect(initialSwitcherBox!.y + initialSwitcherBox!.height).toBeLessThanOrEqual(844);
    expect(navigationBox!.height).toBeGreaterThanOrEqual(40);
    const siteTitleBox = await page.locator(".left.sidebar > .page-title").boundingBox();
    expect(siteTitleBox).not.toBeNull();
    expect(siteTitleBox!.height).toBeLessThanOrEqual(44);

    await friend.scrollIntoViewIfNeeded();
    const [friendBox, switcherBox] = await Promise.all([friend.boundingBox(), switcher.boundingBox()]);
    expect(friendBox).not.toBeNull();
    expect(switcherBox).not.toBeNull();
    for (const box of [friendBox!, switcherBox!]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
    }
    const overlapWidth = Math.min(friendBox!.x + friendBox!.width, switcherBox!.x + switcherBox!.width)
      - Math.max(friendBox!.x, switcherBox!.x);
    const overlapHeight = Math.min(friendBox!.y + friendBox!.height, switcherBox!.y + switcherBox!.height)
      - Math.max(friendBox!.y, switcherBox!.y);
    expect(overlapWidth > 0 && overlapHeight > 0).toBe(false);
    await switcher.click();
    await expect(page).toHaveURL(/\/en$/);
  });

  test("Quartz exposes the configured Refine site as a friend link", async ({ page }) => {
    await page.goto("/zh");
    const footer = page.locator("footer");
    const friend = footer.getByRole("link", { name: "Refine 版" });
    await expect(friend).toBeVisible();
    await expect(friend).toHaveAttribute("href", process.env.NEXT_PUBLIC_PEER_SITE_URL!);
    await expect(friend).toHaveAttribute("rel", "friend noopener noreferrer");
    await expect(friend).toHaveAttribute("target", "_blank");
    await expect(page.locator("#one-blog-language-switcher #one-blog-peer-link")).toHaveCount(0);
  });

  test("robots, sitemap, canonical and hreflang cover both Quartz locales", async ({ page, request, baseURL }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain(`${baseURL}/sitemap.xml`);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const sitemapXml = await sitemap.text();
    for (const pathname of [
      "/zh",
      "/en",
      "/zh/areas/os/chocolatey",
      "/zh/projects/blog/quartz-i18n-example",
      "/en/projects/blog/quartz-i18n-example",
    ]) {
      expect(sitemapXml).toContain(`${baseURL}${pathname}`);
    }
    expect(sitemapXml).not.toContain(`${baseURL}/en/areas/os/chocolatey`);

    const englishArticle = "/en/projects/blog/quartz-i18n-example";
    await page.goto(englishArticle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}${englishArticle}`);
    await expect(page.locator('link[rel="alternate"][hreflang="en-US"]'))
      .toHaveAttribute("href", `${baseURL}${englishArticle}`);
    await expect(page.locator('link[rel="alternate"][hreflang="zh-CN"]'))
      .toHaveAttribute("href", `${baseURL}/zh/projects/blog/quartz-i18n-example`);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]'))
      .toHaveAttribute("href", `${baseURL}/zh/projects/blog/quartz-i18n-example`);
  });
});
