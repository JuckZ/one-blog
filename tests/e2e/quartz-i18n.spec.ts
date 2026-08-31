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

  test("mobile language switch remains visible and usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/zh");
    const switcher = page.getByRole("navigation", { name: "切换语言" }).getByRole("link", { name: "English" });
    await expect(switcher).toBeVisible();
    const box = await switcher.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    await switcher.click();
    await expect(page).toHaveURL(/\/en$/);
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
      "/zh/projects/blog/quartz-i18n-example",
      "/en/projects/blog/quartz-i18n-example",
    ]) {
      expect(sitemapXml).toContain(`${baseURL}${pathname}`);
    }

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
