/**
 * Optional Playwright-based page renderer.
 * Gracefully unavailable when playwright-core is not installed
 * or no browser binary exists (e.g. Vercel serverless).
 */

export interface RenderResult {
  html: string;
  finalUrl: string;
  cookieBannerHandled: boolean;
  errors: string[];
}

const RENDER_TIMEOUT = 25_000;
const NAVIGATION_TIMEOUT = 20_000;
const STABILIZATION_WAIT = 2_000;

const COOKIE_BANNER_SELECTORS = [
  '[class*="cookie"] button[class*="accept"]',
  '[class*="cookie"] button[class*="agree"]',
  '[class*="cookie"] button[class*="allow"]',
  '[class*="consent"] button[class*="accept"]',
  '[class*="consent"] button[class*="agree"]',
  '[id*="cookie"] button[class*="accept"]',
  '[id*="cookie"] button',
  '[id*="consent"] button',
  '[class*="gdpr"] button',
  'button[id*="accept"]',
  'button[id*="agree"]',
  '[data-testid*="cookie"] button',
  '#onetrust-accept-btn-handler',
  '.cc-accept',
  '.cc-allow',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '[aria-label*="accept cookies" i]',
  '[aria-label*="accept all" i]',
  'button:has-text("Agree")',
  'button:has-text("Accept")',
  'button:has-text("동의")',
  'button:has-text("확인")',
  '.cookie button',
  '.cookie-banner button',
  '#cookie button',
];

const OVERLAY_SELECTORS = [
  '[class*="cookie-banner"]',
  '[class*="cookie-notice"]',
  '[class*="consent-banner"]',
  '[class*="gdpr"]',
  '#onetrust-banner-sdk',
  '#CybotCookiebotDialog',
  '.cc-banner',
  '[class*="overlay"][class*="cookie"]',
];

let rendererAvailableCache: boolean | null = null;

export async function isRendererAvailable(): Promise<boolean> {
  if (rendererAvailableCache !== null) return rendererAvailableCache;
  try {
    const pw = await import("playwright-core");
    const browser = await pw.chromium.launch({ headless: true });
    await browser.close();
    rendererAvailableCache = true;
    return true;
  } catch {
    rendererAvailableCache = false;
    return false;
  }
}

export function resetRendererCache(): void {
  rendererAvailableCache = null;
}

export async function renderPage(url: string): Promise<RenderResult> {
  const errors: string[] = [];
  let cookieBannerHandled = false;

  let pw;
  try {
    pw = await import("playwright-core");
  } catch {
    throw new Error("Renderer unavailable: playwright-core not installed");
  }

  let browser;
  try {
    browser = await pw.chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  } catch (err) {
    throw new Error(
      `Browser launch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      timezoneId: "America/New_York",
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(RENDER_TIMEOUT);

    let finalUrl = url;

    let html = "";
    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT,
      });
      finalUrl = page.url();

      if (response) {
        if (!response.ok()) {
          errors.push(`Navigation returned HTTP ${response.status()}`);
        }
        if (response.status() === 403 || response.status() === 429) {
          errors.push(`Access denied/throttled: HTTP ${response.status()}`);
        }
      }
    } catch (navErr) {
      errors.push(
        `Navigation failed: ${navErr instanceof Error ? navErr.message : String(navErr)}`,
      );
    }

    try {
      await page.waitForLoadState("networkidle", {
        timeout: STABILIZATION_WAIT,
      });
    } catch (idleErr) {
      // ignore networkidle timeout
    }

    try {
      cookieBannerHandled = await tryDismissCookieBanner(page, errors);
      if (cookieBannerHandled) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      await tryRemoveOverlays(page);
    } catch (overlayErr) {
      errors.push(`Overlay removal failed: ${overlayErr instanceof Error ? overlayErr.message : String(overlayErr)}`);
    }

    // Hover GNB / Menu items sequentially to trigger hover menus before capturing final content
    try {
      const menuSelectors = [
        "header nav a",
        "header nav li",
        ".gnb > li",
        "#gnb > li",
        ".menu > li",
        ".main-menu > li",
        ".depth1 > li",
        "header nav span",
        "header nav button",
        "button[aria-label*='menu']",
        "button:has-text('메뉴')"
      ];
      for (const selector of menuSelectors) {
        const locators = await page.locator(selector).all().catch(() => []);
        for (const locator of locators.slice(0, 30)) {
          await locator.hover({ timeout: 1000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 100));
        }
      }
    } catch (hoverErr) {
      errors.push(`GNB hover failed: ${hoverErr instanceof Error ? hoverErr.message : String(hoverErr)}`);
    }

    // Scroll footer into view to load lazy GNB/Footer links
    try {
      const footerLocator = page.locator("footer").first();
      const footerCount = await footerLocator.count().catch(() => 0);
      if (footerCount > 0) {
        await footerLocator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (scrollErr) {
      errors.push(`Footer scroll failed: ${scrollErr instanceof Error ? scrollErr.message : String(scrollErr)}`);
    }

    try {
      html = await page.content();
      finalUrl = page.url();
    } catch (contentErr) {
      errors.push(`Content extraction failed: ${contentErr instanceof Error ? contentErr.message : String(contentErr)}`);
    }

    await context.close().catch(() => {});
    return { html, finalUrl, cookieBannerHandled, errors };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function tryDismissCookieBanner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  errors: string[],
): Promise<boolean> {
  for (const selector of COOKIE_BANNER_SELECTORS) {
    try {
      const btn = page.locator(selector).first();
      const count = await btn.count().catch(() => 0);
      if (count > 0) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) {
          await btn.click({ timeout: 2000 });
          return true;
        }
      }
    } catch {
      continue;
    }
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryRemoveOverlays(page: any): Promise<void> {
  try {
    await page.evaluate((selectors: string[]) => {
      for (const sel of selectors) {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      }
      document
        .querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]')
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.3) {
            (el as HTMLElement).style.display = "none";
          }
        });
    }, OVERLAY_SELECTORS);
  } catch {}
}
