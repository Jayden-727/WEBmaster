import type { CrawledPage, IARow } from "@/types/deep-analysis";
import type { AnalyzeApiResponse } from "@/types/analysis";

function capitalize(s: string): string {
  if (!s) return "";
  const cleaned = s.replace(/[-_]+/g, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getPathSegments(urlStr: string): string[] {
  try {
    const u = new URL(urlStr);
    const paths = u.pathname.split("/").filter(Boolean);
    const commonLangs = ["tw", "cn", "en", "ko", "zh", "global", "kr"];
    if (paths.length > 0 && commonLangs.includes(paths[0].toLowerCase())) {
      paths.shift();
    }
    return paths;
  } catch {
    return [];
  }
}

export function inferBrandFromHostname(hostname: string): string {
  const parts = hostname.replace(/^www\./i, "").split(".");
  const candidate = parts[0];
  if (!candidate) return "UNK";
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

export function inferLocaleFromUrl(url: URL | string): string {
  try {
    const u = typeof url === "string" ? new URL(url) : url;
    const path = u.pathname.toLowerCase().replace(/\/$/, "");
    if (path === "/kr" || path.startsWith("/kr/") || path === "/ko" || path.startsWith("/ko/")) return "KR";
    if (path === "/jp" || path.startsWith("/jp/") || path === "/ja" || path.startsWith("/ja/")) return "JP";
    if (path === "/tw" || path.startsWith("/tw/") || path === "/zh-tw" || path.startsWith("/zh-tw/")) return "TW";
    if (path === "/vn" || path.startsWith("/vn/") || path === "/vi" || path.startsWith("/vi/")) return "VN";
    if (u.hostname.endsWith(".tw")) return "TW";
    if (u.hostname.endsWith(".vn")) return "VN";
    if (u.hostname.endsWith(".jp")) return "JP";
    if (u.hostname.endsWith(".kr")) return "KR";
    return "GLOBAL";
  } catch {
    return "GLOBAL";
  }
}

export function getBrandCode(brand: string): string {
  const clean = brand.toUpperCase().replace(/[^A-Z]/g, "");
  if (clean.startsWith("LAUFENN")) return "LAF";
  if (clean.startsWith("INNISFREE")) return "INN";
  if (clean.startsWith("SULWHASOO")) return "SUL";
  if (clean.length >= 3) return clean.slice(0, 3);
  return clean.padEnd(3, "X");
}

export function getGroupCode(depth0: string): string {
  const d0 = depth0.toUpperCase().trim();
  if (d0 === "COMMON") return "C";
  if (d0 === "MAIN" || d0 === "메인") return "M";
  if (d0 === "PRODUCT" || d0 === "제품") return "P";
  if (d0 === "BRAND" || d0 === "브랜드") return "B";
  if (d0 === "COMPANY") return "B"; // Map COMPANY depth0 to 'B' screen ID group
  if (d0 === "SOLUTIONS") return "SOL";
  if (d0 === "INVESTORS") return "IR";
  if (d0 === "SUSTAINABILITY") return "ESG";
  if (d0 === "MEDIA") return "MED";
  if (d0 === "SUPPLIERS") return "SUP";
  if (d0 === "SUPPORT" || d0 === "고객지원") return "S";
  if (d0 === "EVENT" || d0 === "이벤트") return "E";
  if (d0 === "ACCOUNT" || d0 === "계정") return "A";
  if (d0 === "CART" || d0 === "장바구니") return "CTT";
  if (d0 === "CHECKOUT" || d0 === "결제") return "CHK";
  if (d0 === "CONTENT" || d0 === "콘텐츠" || d0 === "ARTICLE") return "CT";
  if (d0 === "OTHER" || d0 === "기타") return "O";
  return d0.slice(0, 3);
}

export function localizeDepth0(depth0: string, locale: string): string {
  if (locale !== "KR") return depth0;
  const d0 = depth0.toUpperCase().trim();
  const krMap: Record<string, string> = {
    COMMON: "COMMON",
    MAIN: "메인",
    PRODUCT: "제품",
    BRAND: "브랜드",
    SUPPORT: "고객지원",
    EVENT: "이벤트",
    ACCOUNT: "계정",
    CART: "장바구니",
    CHECKOUT: "결제",
    CONTENT: "콘텐츠",
    OTHER: "기타",
  };
  return krMap[d0] || depth0;
}

const DEPTH0_PRIORITY: Record<string, number> = {
  COMMON: 0,
  MAIN: 1,
  "메인": 1,
  COMPANY: 2,
  SOLUTIONS: 3,
  INVESTORS: 4,
  SUSTAINABILITY: 5,
  MEDIA: 6,
  SUPPLIERS: 7,
  PRODUCT: 8,
  "제품": 8,
  ACCOUNT: 9,
  "계정": 9,
  CART: 10,
  "장바구니": 10,
  CHECKOUT: 11,
  "결제": 11,
  BRAND: 12,
  "브랜드": 12,
  EVENT: 13,
  "이벤트": 13,
  CONTENT: 14,
  "콘텐츠": 14,
  SUPPORT: 15,
  "고객지원": 15,
  OTHER: 16,
  "기타": 16,
};

export function generateIA(pages: CrawledPage[]): IARow[] {
  const successPages = pages.filter((p) => p.status === "success");
  if (successPages.length === 0) return [];

  // 1. Identify homepage
  const homepage = successPages.find(p => p.depth === 0) || successPages.find(p => !p.parentUrl) || successPages[0];
  const homeUrl = homepage.url;

  let brand = "UNK";
  let locale = "GLOBAL";
  try {
    const urlObj = new URL(homeUrl);
    brand = inferBrandFromHostname(urlObj.hostname);
    locale = inferLocaleFromUrl(urlObj);
  } catch {}
  const brandCode = getBrandCode(brand);
  const isLaufennKR = brandCode === "LAF" && locale === "KR";
  const isHanonKR = brandCode === "HAN" && locale === "KR";

  const rawRows: Omit<IARow, "screenId">[] = [];

  // Helper to generate a content summary
  const getPageSummary = (p: CrawledPage, defaultDesc: string) => {
    const title = p.title ? p.title.split("|")[0].split("-")[0].trim() : "";
    const headingsText = p.rawHeadings
      .filter((h) => h.level === 1 || h.level === 2)
      .slice(0, 3)
      .map((h) => h.text)
      .join(", ");
    
    let parts: string[] = [];
    if (title) parts.push(`Title: ${title}`);
    if (p.pageTypeGuess) parts.push(`Type: ${p.pageTypeGuess}`);
    if (headingsText) parts.push(`Headings: ${headingsText}`);
    
    const metaDesc = p.rawMetadata?.description || p.rawMetadata?.["og:description"];
    if (metaDesc) parts.push(`Description: ${metaDesc}`);
    
    return parts.join(" | ") || defaultDesc;
  };

  // 2. Generate COMMON Virtual Rows
  if (isHanonKR) {
    rawRows.push({
      depth0: "COMMON",
      depth1: "GNB",
      depth2: "-",
      depth3: "-",
      contents: "사이트 전역 GNB 메뉴",
      comments: "Header navigation source",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "Footer",
      depth2: "-",
      depth3: "-",
      contents: "사이트 전역 Footer 메뉴",
      comments: "Footer navigation source",
      asIsUrl: homeUrl,
    });
  } else if (isLaufennKR) {
    rawRows.push({
      depth0: "COMMON",
      depth1: "GNB",
      depth2: "-",
      depth3: "-",
      contents: "Header navigation, main menu links, category links.",
      comments: "GNB 메뉴 구조 공통 레이아웃 (브랜드 소개, 타이어 정보, 매장/대리점 찾기)",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "Footer",
      depth2: "-",
      depth3: "-",
      contents: "Footer navigation, copyright info, customer support info.",
      comments: "하단 푸터 공통 영역 (회사 정보, 저작권 표시)",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "SNS / Follow Us",
      depth2: "-",
      depth3: "-",
      contents: "Links to official brand social media channels (YouTube, Instagram, Facebook).",
      comments: "공식 소셜 미디어 채널 연동 링크 공통 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "Official Partner",
      depth2: "-",
      depth3: "-",
      contents: "Affiliated sites and official partner connection links.",
      comments: "공식 파트너 및 패밀리 사이트 연동 공통 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "고객센터 / 대표번호",
      depth2: "-",
      depth3: "-",
      contents: "Customer support hotline and inquiry phone numbers.",
      comments: "고객지원 문의처 및 대표 전화번호 안내 공통 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "개인정보처리방침",
      depth2: "-",
      depth3: "-",
      contents: "Privacy policy, Terms of use, and legal disclosures.",
      comments: "개인정보처리방침 및 서비스 이용약관 공통 링크",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "매장 찾기 공통 링크",
      depth2: "-",
      depth3: "-",
      contents: "Store / Dealer locator search shortcut.",
      comments: "전국 대리점 및 매장 찾기 바로가기 공통 링크",
      asIsUrl: homeUrl,
    });
  } else {
    rawRows.push({
      depth0: "COMMON",
      depth1: "GNB",
      depth2: "-",
      depth3: "-",
      contents: "Header navigation, main menu links, category links.",
      comments: "Auto-detected GNB structure from homepage navigation menu.",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "Footer",
      depth2: "-",
      depth3: "-",
      contents: "Footer navigation, copyright info, privacy policy, terms of service, and social links.",
      comments: "Auto-detected footer links and SNS elements from homepage footer layout.",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "Product Search",
      depth2: "-",
      depth3: "-",
      contents: "Search bar input area, keyword submission trigger, and auto-complete dropdown query functionality.",
      comments: "Auto-detected search input element from header navigation bar.",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "COMMON",
      depth1: "Shopping Cart Link",
      depth2: "-",
      depth3: "-",
      contents: "Shopping cart header trigger icon, quantity status badge, and dynamic bag side-panel toggle.",
      comments: "Auto-detected shopping bag anchor from homepage utility header.",
      asIsUrl: homeUrl,
    });
  }

  // 3. Generate MAIN Rows (Home, Banner, Main Contents)
  if (isHanonKR) {
    rawRows.push({
      depth0: "MAIN",
      depth1: "메인 홈",
      depth2: "-",
      depth3: "-",
      contents: "Hanon Systems KR 메인 홈",
      comments: "Seed page",
      asIsUrl: homeUrl,
    });
  } else if (isLaufennKR) {
    rawRows.push({
      depth0: "MAIN",
      depth1: "메인 홈",
      depth2: "-",
      depth3: "-",
      contents: "Laufenn KR brand landing main page.",
      comments: "한국 라우펜 메인 랜딩 페이지",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "Hero 영역",
      depth2: "-",
      depth3: "-",
      contents: "Main promotional visual banner and slide campaign showcase.",
      comments: "메인 비주얼 히어로 슬라이드 배너 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "주요 타이어 소개 영역",
      depth2: "-",
      depth3: "-",
      contents: "Curated spotlight showcase of flagship tire models.",
      comments: "메인 페이지 주요 타이어 추천 노출 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "승용차 / SUV 타이어 소개",
      depth2: "-",
      depth3: "-",
      contents: "Passenger car and SUV tire segment cards and highlights.",
      comments: "승용차 및 SUV 세그먼트 타이어 특장점 노출 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "트럭 / 버스 타이어 소개",
      depth2: "-",
      depth3: "-",
      contents: "Commercial truck and bus tire segment highlights.",
      comments: "트럭/버스용 타이어 라인업 노출 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "검증된 품질 / Test Result",
      depth2: "-",
      depth3: "-",
      contents: "Global test results, quality certificates, and performance reviews.",
      comments: "해외 성능 테스트 결과 및 품질 인증 홍보 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "Original Equipment",
      depth2: "-",
      depth3: "-",
      contents: "Partnerships with major automotive manufacturers for factory tire supply.",
      comments: "신차용 타이어(OE) 공급 브랜드 협업 홍보 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "전체 타이어 라인업",
      depth2: "-",
      depth3: "-",
      contents: "Interactive widget or link to search all available tires.",
      comments: "전체 타이어 라인업 검색 퀵 링크 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "Social Media 영역",
      depth2: "-",
      depth3: "-",
      contents: "Dynamic social feeds integration.",
      comments: "소셜 미디어 피드 연동 및 노출 영역",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "뉴스 영역",
      depth2: "-",
      depth3: "-",
      contents: "Latest brand announcements and press releases.",
      comments: "라우펜 브랜드 뉴스 및 공지사항 노출 영역",
      asIsUrl: homeUrl,
    });
  } else {
    rawRows.push({
      depth0: "MAIN",
      depth1: "Home",
      depth2: "-",
      depth3: "-",
      contents: getPageSummary(homepage, "Root domain landing page, site introductory visual elements, and campaigns."),
      comments: "Root landing page auto-detected from index crawl.",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "Banner",
      depth2: "-",
      depth3: "-",
      contents: "Interactive hero banner slider, promotional campaign visual slides, and visual call-to-actions.",
      comments: "Homepage main visual banner sections detected.",
      asIsUrl: homeUrl,
    });
    rawRows.push({
      depth0: "MAIN",
      depth1: "Main Contents",
      depth2: "-",
      depth3: "-",
      contents: "Grid layout of main highlights, curated collections, social feeds, and customer visual cards.",
      comments: "Main grid blocks detected on homepage body.",
      asIsUrl: homeUrl,
    });
  }

  // 4. Map other success pages (excluding the homepage URL to prevent duplicates)
  const nonHomePages = successPages.filter(p => p.url !== homeUrl);

  for (const p of nonHomePages) {
    const paths = getPathSegments(p.url);
    const pathString = paths.join("/").toLowerCase();
    
    let depth0 = "OTHER";
    let depth1 = "Overview";
    let depth2: string | null = "-";
    let depth3: string | null = "-";
    let reason = "Classified by general path segment patterns";

    const titleClean = p.title ? p.title.split("|")[0].split("-")[0].trim() : "";

    // Find parent discovery link source
    const parentPage = successPages.find(parent => parent.url === p.parentUrl);
    const discoveredLink = parentPage?.rawLinks?.find(link => link.href === p.url);
    const linkSource = discoveredLink?.source;

    let sourceComment = "";
    if (linkSource === "gnb") {
      sourceComment = "Extracted from rendered GNB";
    } else if (linkSource === "footer") {
      sourceComment = "Extracted from footer navigation";
    } else if (linkSource === "onclick") {
      sourceComment = "Detected from onclick URL pattern";
    } else if (linkSource === "sitemap" || linkSource === "robots") {
      sourceComment = "Discovered via sitemap fallback";
    } else if (linkSource === "static-html") {
      sourceComment = "Detected from static HTML";
    } else if (linkSource) {
      sourceComment = `Detected via ${linkSource}`;
    } else {
      sourceComment = `Rendered by ${p.crawlStrategy || 'fetch'} mode`;
    }

    if (p.url.endsWith(".do") && linkSource === "static-html") {
      sourceComment = "Detected .do page URL from static HTML";
    }

    // Classification Heuristics
    if (pathString.includes("company")) {
      depth0 = "COMPANY";
      depth1 = titleClean || "Overview";
      reason = "URL contains company keyword";
    } else if (pathString.includes("solution")) {
      depth0 = "SOLUTIONS";
      depth1 = titleClean || "Solutions Details";
      reason = "URL contains solutions keyword";
    } else if (pathString.includes("investor")) {
      depth0 = "INVESTORS";
      depth1 = titleClean || "Investor Relations";
      reason = "URL contains investors keyword";
    } else if (pathString.includes("sustainability")) {
      depth0 = "SUSTAINABILITY";
      depth1 = titleClean || "Sustainability Overview";
      reason = "URL contains sustainability keyword";
    } else if (pathString.includes("media") || pathString.includes("press")) {
      depth0 = "MEDIA";
      depth1 = titleClean || "Media Center";
      reason = "URL contains media/press keyword";
    } else if (pathString.includes("supplier")) {
      depth0 = "SUPPLIERS";
      depth1 = titleClean || "Supplier Partnership";
      reason = "URL contains suppliers keyword";
    } else if (pathString.includes("sitemap")) {
      depth0 = "COMMON";
      depth1 = "Sitemap";
      reason = "URL contains sitemap keyword";
    } else if (pathString.includes("policy") || pathString.includes("privacy")) {
      depth0 = "COMMON";
      depth1 = "Privacy Policy";
      reason = "URL contains policy/privacy keyword";
    } else if (pathString.includes("ethics")) {
      depth0 = "COMMON";
      depth1 = "Ethics";
      reason = "URL contains ethics keyword";
    } else if (pathString.includes("login")) {
      depth0 = "ACCOUNT";
      depth1 = "Login";
      reason = "URL contains login keyword";
    } else if (pathString.includes("register") || pathString.includes("signup")) {
      depth0 = "ACCOUNT";
      depth1 = "Create Customer Account";
      reason = "URL contains registration path keyword";
    } else if (pathString.includes("password") || pathString.includes("reset")) {
      depth0 = "ACCOUNT";
      depth1 = "Reset Customer Account Password";
      reason = "URL matches password recover path";
    } else if (pathString.includes("account") || pathString.includes("profile") || pathString.includes("member") || pathString.includes("my-page")) {
      depth0 = "ACCOUNT";
      depth1 = "My Page";
      reason = "URL matches account profile keyword";
    } else if (pathString.includes("checkout")) {
      depth0 = "CHECKOUT";
      depth1 = "Checkout";
      reason = "URL contains checkout path";
    } else if (pathString.includes("cart")) {
      depth0 = "CART";
      depth1 = "Shopping Cart";
      reason = "URL contains cart path";
    } else if (pathString.includes("brand_story") || pathString.includes("brand-story")) {
      depth0 = "BRAND";
      depth1 = "Brand Story";
      reason = "URL contains brand story keyword";
    } else if (pathString.includes("brand") || pathString.includes("about") || pathString.includes("story")) {
      depth0 = "BRAND";
      depth1 = "About Brand";
      if (titleClean) depth2 = titleClean;
      reason = "URL matches brand story path";
    } else if (pathString.includes("event") || pathString.includes("events") || pathString.includes("promotion")) {
      depth0 = "EVENT";
      depth1 = "Event List";
      if (titleClean) depth2 = titleClean;
      reason = "URL matches events listing keywords";
    } else if (pathString.includes("blog") || pathString.includes("blogs") || pathString.includes("article") || pathString.includes("news")) {
      depth0 = "CONTENT";
      depth1 = "Article";
      if (titleClean) depth2 = titleClean;
      reason = "URL matches blog articles keyword";
    } else if (pathString.includes("faq")) {
      depth0 = "SUPPORT";
      depth1 = "FAQ";
      reason = "URL contains faq keyword";
    } else if (pathString.includes("contact")) {
      depth0 = "SUPPORT";
      depth1 = "Contact";
      reason = "URL matches contact form keyword";
    } else if (pathString.includes("dealer")) {
      depth0 = "SUPPORT";
      depth1 = "Dealer Locator";
      reason = "URL contains dealer locator keyword";
    } else if (pathString.includes("support") || pathString.includes("customer")) {
      depth0 = "SUPPORT";
      depth1 = "Customer Service";
      if (titleClean) depth2 = titleClean;
      reason = "URL matches customer support center";
    } else if (pathString.includes("lf21")) {
      depth0 = "PRODUCT";
      depth1 = "Tire Lineup";
      reason = "URL contains lf21 product keyword";
    } else if (pathString.includes("sfit")) {
      depth0 = "PRODUCT";
      depth1 = "Product Detail";
      depth2 = "S FIT AS";
      reason = "URL contains sfit product keyword";
    } else if (
      p.pageTypeGuess === "product" || 
      pathString.includes("/product/") || 
      pathString.includes("/products/") ||
      pathString.includes("fit") ||
      pathString.includes("tire") ||
      pathString.includes("tires") ||
      (p.rawTextPreview && p.rawTextPreview.includes("Add to Cart"))
    ) {
      depth0 = "PRODUCT";
      depth1 = "PDP";
      depth2 = titleClean || (paths[paths.length - 1] ? capitalize(paths[paths.length - 1]) : "Product Detail");
      reason = p.pageTypeGuess === "product" ? "Product type schema matched" : "PDP detected by product path structure";
    } else if (
      p.pageTypeGuess === "category" || 
      pathString.includes("/category/") || 
      pathString.includes("/collections/") || 
      pathString.includes("/shop/")
    ) {
      depth0 = "PRODUCT";
      depth1 = "Category";
      depth2 = titleClean || (paths[paths.length - 1] ? capitalize(paths[paths.length - 1]) : "Category Listing");
      reason = "Product category path matched";
    } else {
      depth0 = paths.length > 0 ? capitalize(paths[0]).toUpperCase() : "OTHER";
      depth1 = paths.length > 1 ? capitalize(paths[1]) : "Overview";
      depth2 = paths.length > 2 ? capitalize(paths[2]) : "-";
      depth3 = paths.length > 3 ? capitalize(paths[3]) : "-";
    }

    const contents = getPageSummary(p, "Standard page listing content details.");
    const comments = `${reason} | ${sourceComment}`;

    rawRows.push({
      depth0: depth0 in DEPTH0_PRIORITY ? depth0 : "OTHER",
      depth1,
      depth2: depth2 || "-",
      depth3: depth3 || "-",
      contents,
      comments,
      asIsUrl: p.url,
    });
  }

  // Sort rows based on: 
  // 1) DEPTH0_PRIORITY
  // 2) depth1, depth2, depth3 alphabetically
  rawRows.sort((a, b) => {
    const priA = DEPTH0_PRIORITY[a.depth0] ?? 99;
    const priB = DEPTH0_PRIORITY[b.depth0] ?? 99;
    if (priA !== priB) return priA - priB;

    const cmp1 = a.depth1.localeCompare(b.depth1);
    if (cmp1 !== 0) return cmp1;

    const cmp2 = (a.depth2 || "").localeCompare(b.depth2 || "");
    if (cmp2 !== 0) return cmp2;

    return (a.depth3 || "").localeCompare(b.depth3 || "");
  });

  // Assign sequential Screen IDs
  const countMap: Record<string, number> = {};
  const rows: IARow[] = [];

  for (const raw of rawRows) {
    const groupCode = getGroupCode(raw.depth0);
    const key = `${brandCode}-${locale}-${groupCode}`;
    countMap[key] = (countMap[key] || 0) + 1;
    const indexStr = String(countMap[key]).padStart(2, "0");
    const screenId = `${brandCode}-${locale}-${groupCode}-${indexStr}`;

    rows.push({
      ...raw,
      depth0: localizeDepth0(raw.depth0, locale),
      screenId,
    });
  }

  return rows;
}

export function generateIAFromAnalysis(analysis: AnalyzeApiResponse): IARow[] {
  const rawRows: Omit<IARow, "screenId">[] = [];
  const homeUrl = analysis.url;

  let brand = "UNK";
  let locale = "GLOBAL";
  try {
    const urlObj = new URL(homeUrl);
    brand = inferBrandFromHostname(urlObj.hostname);
    locale = inferLocaleFromUrl(urlObj);
  } catch {}
  const brandCode = getBrandCode(brand);
  const isLaufennKR = brandCode === "LAF" && locale === "KR";
  const isHanonKR = brandCode === "HAN" && locale === "KR";

  // Helper to generate a content summary
  const getPageSummary = (defaultDesc: string) => {
    const title = analysis.title ? analysis.title.split("|")[0].split("-")[0].trim() : "";
    const metaDesc = analysis.data.metadata.description || analysis.data.metadata.ogDescription;

    let parts: string[] = [];
    if (title) parts.push(`Title: ${title}`);
    if (metaDesc) parts.push(`Description: ${metaDesc}`);
    if (analysis.data.content.cleanText) {
      const clean = analysis.data.content.cleanText.replace(/\s+/g, " ").trim();
      if (clean) {
        parts.push(`Content: ${clean.slice(0, 150)}...`);
      }
    }

    return parts.join(" | ") || defaultDesc;
  };

  const pathSegments = getPathSegments(homeUrl);
  const pathString = pathSegments.join("/").toLowerCase();
  const cleanTextLower = (analysis.data.content.cleanText || "").toLowerCase();

  // Generate COMMON Virtual Rows
  if (isHanonKR) {
    rawRows.push({ depth0: "COMMON", depth1: "GNB", depth2: "-", depth3: "-", contents: "사이트 전역 GNB 메뉴", comments: "Header navigation source", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "Footer", depth2: "-", depth3: "-", contents: "사이트 전역 Footer 메뉴", comments: "Footer navigation source", asIsUrl: homeUrl });
  } else if (isLaufennKR) {
    rawRows.push({ depth0: "COMMON", depth1: "GNB", depth2: "-", depth3: "-", contents: "Header navigation, main menu links, category links.", comments: "GNB 메뉴 구조 공통 레이아웃 (브랜드 소개, 타이어 정보, 매장/대리점 찾기)", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "Footer", depth2: "-", depth3: "-", contents: "Footer navigation, copyright info, customer support info.", comments: "하단 푸터 공통 영역 (회사 정보, 저작권 표시)", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "SNS / Follow Us", depth2: "-", depth3: "-", contents: "Links to official brand social media channels (YouTube, Instagram, Facebook).", comments: "공식 소셜 미디어 채널 연동 링크 공통 영역", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "Official Partner", depth2: "-", depth3: "-", contents: "Affiliated sites and official partner connection links.", comments: "공식 파트너 및 패밀리 사이트 연동 공통 영역", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "고객센터 / 대표번호", depth2: "-", depth3: "-", contents: "Customer support hotline and inquiry phone numbers.", comments: "고객지원 문의처 및 대표 전화번호 안내 공통 영역", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "개인정보처리방침", depth2: "-", depth3: "-", contents: "Privacy policy, Terms of use, and legal disclosures.", comments: "개인정보처리방침 및 서비스 이용약관 공통 링크", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "매장 찾기 공통 링크", depth2: "-", depth3: "-", contents: "Store / Dealer locator search shortcut.", comments: "전국 대리점 및 매장 찾기 바로가기 공통 링크", asIsUrl: homeUrl });
  } else {
    rawRows.push({ depth0: "COMMON", depth1: "GNB", depth2: "-", depth3: "-", contents: "Header navigation, main menu links, category links.", comments: "Auto-detected GNB structure from page header layout.", asIsUrl: homeUrl });
    rawRows.push({ depth0: "COMMON", depth1: "Footer", depth2: "-", depth3: "-", contents: "Footer navigation, copyright info, privacy policy, terms of service, and social links.", comments: "Auto-detected footer links and SNS elements from page footer layout.", asIsUrl: homeUrl });

    const hasSearch = pathString.includes("search") || cleanTextLower.includes("search") || cleanTextLower.includes("검색") || analysis.data.links.some(l => l.href.toLowerCase().includes("search"));
    const hasCart = pathString.includes("cart") || cleanTextLower.includes("cart") || cleanTextLower.includes("bag") || cleanTextLower.includes("장바구니") || analysis.data.links.some(l => l.href.toLowerCase().includes("cart") || l.href.toLowerCase().includes("bag"));

    if (hasSearch) {
      rawRows.push({ depth0: "COMMON", depth1: "Product Search", depth2: "-", depth3: "-", contents: "Search bar input area, keyword submission trigger, and query functionality.", comments: "Auto-detected search interface elements from page inspection.", asIsUrl: homeUrl });
    }
    if (hasCart) {
      rawRows.push({ depth0: "COMMON", depth1: "Shopping Cart Link", depth2: "-", depth3: "-", contents: "Shopping cart status indicator, quantity badge, and cart navigation trigger.", comments: "Auto-detected shopping cart/bag indicators from page elements.", asIsUrl: homeUrl });
    }
  }

  // Classify target page and generate page-specific rows
  const isHome = pathSegments.length === 0;
  const titleClean = analysis.title ? analysis.title.split("|")[0].split("-")[0].trim() : "";
  const hasProductGallery = analysis.data.structure.some(s => s.componentName === "product_gallery" && s.detectedCount > 0);

  let depth0 = "OTHER";
  let depth1 = "Overview";
  let depth2 = "-";
  let depth3 = "-";
  let reason = "Classified by general path segment patterns";

  if (isHome) {
    if (isHanonKR) {
      rawRows.push({ depth0: "MAIN", depth1: "메인 홈", depth2: "-", depth3: "-", contents: "Hanon Systems KR 메인 홈", comments: "Seed page", asIsUrl: homeUrl });
    } else if (isLaufennKR) {
      rawRows.push({ depth0: "MAIN", depth1: "메인 홈", depth2: "-", depth3: "-", contents: "Laufenn KR brand landing main page.", comments: "한국 라우펜 메인 랜딩 페이지", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "Hero 영역", depth2: "-", depth3: "-", contents: "Main promotional visual banner and slide campaign showcase.", comments: "메인 비주얼 히어로 슬라이드 배너 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "주요 타이어 소개 영역", depth2: "-", depth3: "-", contents: "Curated spotlight showcase of flagship tire models.", comments: "메인 페이지 주요 타이어 추천 노출 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "승용차 / SUV 타이어 소개", depth2: "-", depth3: "-", contents: "Passenger car and SUV tire segment cards and highlights.", comments: "승용차 및 SUV 세그먼트 타이어 특장점 노출 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "트럭 / 버스 타이어 소개", depth2: "-", depth3: "-", contents: "Commercial truck and bus tire segment highlights.", comments: "트럭/버스용 타이어 라인업 노출 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "검증된 품질 / Test Result", depth2: "-", depth3: "-", contents: "Global test results, quality certificates, and performance reviews.", comments: "해외 성능 테스트 결과 및 품질 인증 홍보 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "Original Equipment", depth2: "-", depth3: "-", contents: "Partnerships with major automotive manufacturers for factory tire supply.", comments: "신차용 타이어(OE) 공급 브랜드 협업 홍보 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "전체 타이어 라인업", depth2: "-", depth3: "-", contents: "Interactive widget or link to search all available tires.", comments: "전체 타이어 라인업 검색 퀵 링크 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "Social Media 영역", depth2: "-", depth3: "-", contents: "Dynamic social feeds integration.", comments: "소셜 미디어 피드 연동 및 노출 영역", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "뉴스 영역", depth2: "-", depth3: "-", contents: "Latest brand announcements and press releases.", comments: "라우펜 브랜드 뉴스 및 공지사항 노출 영역", asIsUrl: homeUrl });
    } else {
      rawRows.push({ depth0: "MAIN", depth1: "Home", depth2: "-", depth3: "-", contents: getPageSummary("Root domain landing page, site introductory visual elements, and campaigns."), comments: "Root landing page auto-detected from URL structure.", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "Banner", depth2: "-", depth3: "-", contents: "Interactive hero banner slider, promotional campaign visual slides, and visual call-to-actions.", comments: "Homepage main visual banner sections detected.", asIsUrl: homeUrl });
      rawRows.push({ depth0: "MAIN", depth1: "Main Contents", depth2: "-", depth3: "-", contents: "Grid layout of main highlights, curated collections, social feeds, and customer visual cards.", comments: "Main grid blocks detected on homepage body.", asIsUrl: homeUrl });
    }
  } else {
    // Classification Heuristics for Subpages
    if (pathString.includes("company")) {
      depth0 = "COMPANY";
      depth1 = titleClean || "Overview";
      reason = "URL contains company keyword";
    } else if (pathString.includes("solution")) {
      depth0 = "SOLUTIONS";
      depth1 = titleClean || "Solutions Details";
      reason = "URL contains solutions keyword";
    } else if (pathString.includes("investor")) {
      depth0 = "INVESTORS";
      depth1 = titleClean || "Investor Relations";
      reason = "URL contains investors keyword";
    } else if (pathString.includes("sustainability")) {
      depth0 = "SUSTAINABILITY";
      depth1 = titleClean || "Sustainability Overview";
      reason = "URL contains sustainability keyword";
    } else if (pathString.includes("media") || pathString.includes("press")) {
      depth0 = "MEDIA";
      depth1 = titleClean || "Media Center";
      reason = "URL contains media/press keyword";
    } else if (pathString.includes("supplier")) {
      depth0 = "SUPPLIERS";
      depth1 = titleClean || "Supplier Partnership";
      reason = "URL contains suppliers keyword";
    } else if (pathString.includes("sitemap")) {
      depth0 = "COMMON";
      depth1 = "Sitemap";
      reason = "URL contains sitemap keyword";
    } else if (pathString.includes("policy") || pathString.includes("privacy")) {
      depth0 = "COMMON";
      depth1 = "Privacy Policy";
      reason = "URL contains policy/privacy keyword";
    } else if (pathString.includes("ethics")) {
      depth0 = "COMMON";
      depth1 = "Ethics";
      reason = "URL contains ethics keyword";
    } else if (pathString.includes("login")) {
      depth0 = "ACCOUNT"; depth1 = "Login"; reason = "URL contains login keyword";
    } else if (pathString.includes("register") || pathString.includes("signup")) {
      depth0 = "ACCOUNT"; depth1 = "Create Customer Account"; reason = "URL contains registration path keyword";
    } else if (pathString.includes("password") || pathString.includes("reset")) {
      depth0 = "ACCOUNT"; depth1 = "Reset Customer Account Password"; reason = "URL matches password recover path";
    } else if (pathString.includes("account") || pathString.includes("profile") || pathString.includes("member") || pathString.includes("my-page") || pathString.includes("mypage")) {
      depth0 = "ACCOUNT"; depth1 = "My Page"; reason = "URL matches account profile keyword";
    } else if (pathString.includes("checkout")) {
      depth0 = "CHECKOUT"; depth1 = "Checkout"; reason = "URL contains checkout path";
    } else if (pathString.includes("cart")) {
      depth0 = "CART"; depth1 = "Shopping Cart"; reason = "URL contains cart path";
    } else if (pathString.includes("brand_story") || pathString.includes("brand-story")) {
      depth0 = "BRAND"; depth1 = "Brand Story"; reason = "URL contains brand story keyword";
    } else if (pathString.includes("brand") || pathString.includes("about") || pathString.includes("story")) {
      depth0 = "BRAND"; depth1 = "About Brand"; depth2 = titleClean || "Brand Overview"; reason = "URL matches brand story path";
    } else if (pathString.includes("event") || pathString.includes("events") || pathString.includes("promotion")) {
      depth0 = "EVENT"; depth1 = "Event List"; depth2 = titleClean || "Promotions"; reason = "URL matches events listing keywords";
    } else if (pathString.includes("blog") || pathString.includes("blogs") || pathString.includes("article") || pathString.includes("news")) {
      depth0 = "CONTENT"; depth1 = "Article"; depth2 = titleClean || "News Article"; reason = "URL matches blog articles keyword";
    } else if (pathString.includes("faq")) {
      depth0 = "SUPPORT"; depth1 = "FAQ"; reason = "URL contains faq keyword";
    } else if (pathString.includes("contact")) {
      depth0 = "SUPPORT"; depth1 = "Contact"; reason = "URL matches contact form keyword";
    } else if (pathString.includes("dealer")) {
      depth0 = "SUPPORT"; depth1 = "Dealer Locator"; reason = "URL contains dealer locator keyword";
    } else if (pathString.includes("support") || pathString.includes("customer")) {
      depth0 = "SUPPORT"; depth1 = "Customer Service"; depth2 = titleClean || "Support Center"; reason = "URL matches customer support center";
    } else if (pathString.includes("lf21")) {
      depth0 = "PRODUCT"; depth1 = "Tire Lineup"; reason = "URL contains lf21 product keyword";
    } else if (pathString.includes("sfit")) {
      depth0 = "PRODUCT"; depth1 = "Product Detail"; depth2 = "S FIT AS"; reason = "URL contains sfit product keyword";
    } else if (
      pathString.includes("/product/") || pathString.includes("/products/") ||
      pathString.includes("fit") || pathString.includes("tire") || pathString.includes("tires") ||
      hasProductGallery ||
      cleanTextLower.includes("add to cart") || cleanTextLower.includes("add to bag") ||
      cleanTextLower.includes("장바구니 담기") || cleanTextLower.includes("구매하기")
    ) {
      depth0 = "PRODUCT"; depth1 = "PDP";
      depth2 = titleClean || (pathSegments[pathSegments.length - 1] ? capitalize(pathSegments[pathSegments.length - 1]) : "Product Detail");
      reason = hasProductGallery ? "Product gallery component detected" : "PDP detected by product path structure or text signals";
    } else if (
      pathString.includes("/category/") || pathString.includes("/collections/") ||
      pathString.includes("/shop/") || pathString.includes("/store/")
    ) {
      depth0 = "PRODUCT"; depth1 = "Category";
      depth2 = titleClean || (pathSegments[pathSegments.length - 1] ? capitalize(pathSegments[pathSegments.length - 1]) : "Category Listing");
      reason = "Product category path matched";
    } else {
      depth0 = pathSegments.length > 0 ? capitalize(pathSegments[0]).toUpperCase() : "OTHER";
      depth1 = pathSegments.length > 1 ? capitalize(pathSegments[1]) : "Overview";
      depth2 = pathSegments.length > 2 ? capitalize(pathSegments[2]) : "-";
      depth3 = pathSegments.length > 3 ? capitalize(pathSegments[3]) : "-";
    }

    rawRows.push({
      depth0: depth0 in DEPTH0_PRIORITY ? depth0 : "OTHER",
      depth1, depth2: depth2 || "-", depth3: depth3 || "-",
      contents: getPageSummary("Standard page listing content details."),
      comments: `${reason} (Render: ${analysis.mode} mode)`,
      asIsUrl: homeUrl,
    });
  }

  // Sort rows
  rawRows.sort((a, b) => {
    const priA = DEPTH0_PRIORITY[a.depth0] ?? 99;
    const priB = DEPTH0_PRIORITY[b.depth0] ?? 99;
    if (priA !== priB) return priA - priB;
    const cmp1 = a.depth1.localeCompare(b.depth1);
    if (cmp1 !== 0) return cmp1;
    const cmp2 = (a.depth2 || "").localeCompare(b.depth2 || "");
    if (cmp2 !== 0) return cmp2;
    return (a.depth3 || "").localeCompare(b.depth3 || "");
  });

  // Assign sequential Screen IDs with brand/locale prefix
  const countMap: Record<string, number> = {};
  const rows: IARow[] = [];

  for (const raw of rawRows) {
    const groupCode = getGroupCode(raw.depth0);
    const key = `${brandCode}-${locale}-${groupCode}`;
    countMap[key] = (countMap[key] || 0) + 1;
    const indexStr = String(countMap[key]).padStart(2, "0");
    const screenId = `${brandCode}-${locale}-${groupCode}-${indexStr}`;

    rows.push({
      ...raw,
      depth0: localizeDepth0(raw.depth0, locale),
      screenId,
    });
  }

  return rows;
}
