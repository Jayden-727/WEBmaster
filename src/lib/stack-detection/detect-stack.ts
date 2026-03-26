import type { StackSignalResult, StackCategory } from "@/types/analysis";

interface TechSignature {
  name: string;
  category: StackCategory;
  description: string;
  patterns: (string | RegExp)[];
  confidence: number;
}

const SIGNATURES: TechSignature[] = [
  // ── eCommerce ──
  { name: "Shopify", category: "ecommerce", description: "Hosted eCommerce platform", confidence: 0.92, patterns: ["cdn.shopify.com", "shopify.com/s/files", "shopify.theme", "shopify-section"] },
  { name: "Shopify Plus", category: "ecommerce", description: "Enterprise Shopify plan with checkout customization", confidence: 0.85, patterns: ["shopify-plus", "checkout.shopify.com", "plus.shopify"] },
  { name: "WooCommerce", category: "ecommerce", description: "WordPress eCommerce plugin", confidence: 0.90, patterns: ["woocommerce", "wc-ajax", "wc-cart", "wc-blocks"] },
  { name: "Magento", category: "ecommerce", description: "Adobe Commerce / Magento eCommerce", confidence: 0.88, patterns: ["magento", "mage/cookies", "mage-init", "requirejs/require"] },
  { name: "BigCommerce", category: "ecommerce", description: "SaaS eCommerce platform", confidence: 0.88, patterns: ["bigcommerce.com", "stencil-utils", "bigcommerce"] },
  { name: "Salesforce Commerce Cloud", category: "ecommerce", description: "Salesforce B2C Commerce", confidence: 0.85, patterns: ["demandware.static", "demandware.net", "dw/shop"] },
  { name: "PrestaShop", category: "ecommerce", description: "Open-source eCommerce", confidence: 0.85, patterns: ["prestashop", "/modules/ps_", "var prestashop"] },

  // ── CMS ──
  { name: "WordPress", category: "cms", description: "Popular open-source CMS", confidence: 0.90, patterns: ["wp-content", "wp-json", "wp-includes", "wordpress"] },
  { name: "Drupal", category: "cms", description: "Enterprise open-source CMS", confidence: 0.88, patterns: ["drupal.js", "drupal.settings", "/sites/default/files"] },
  { name: "Contentful", category: "cms", description: "Headless CMS", confidence: 0.82, patterns: ["contentful.com", "ctfassets.net"] },
  { name: "Strapi", category: "cms", description: "Open-source headless CMS", confidence: 0.80, patterns: ["strapi", "/api/upload/files"] },
  { name: "Webflow", category: "cms", description: "Visual website builder and CMS", confidence: 0.90, patterns: ["webflow.com", "wf-section", "webflow.js"] },
  { name: "Squarespace", category: "cms", description: "Website builder and hosting", confidence: 0.90, patterns: ["squarespace.com", "sqsp", "static.squarespace"] },
  { name: "Wix", category: "cms", description: "Cloud-based website builder", confidence: 0.90, patterns: ["wix.com", "wixstatic.com", "wix-code"] },
  { name: "Ghost", category: "cms", description: "Open-source publishing platform", confidence: 0.85, patterns: ["ghost.io", "ghost.org", "ghost-"] },
  { name: "HubSpot CMS", category: "cms", description: "HubSpot content management system", confidence: 0.85, patterns: ["hubspot.com", "hs-scripts.com", "hbspt.forms"] },

  // ── Frameworks ──
  { name: "Next.js", category: "framework", description: "React framework with SSR/SSG", confidence: 0.95, patterns: ["/_next/", "__next_data__", "__next", "next/dist"] },
  { name: "React", category: "framework", description: "UI component library by Meta", confidence: 0.85, patterns: ["react.development", "react-dom", "__react", "data-reactroot", "data-reactid"] },
  { name: "Vue.js", category: "framework", description: "Progressive JavaScript framework", confidence: 0.85, patterns: ["vue.js", "vue.min.js", "__vue__", "v-cloak", "data-v-"] },
  { name: "Nuxt.js", category: "framework", description: "Vue.js meta-framework", confidence: 0.90, patterns: ["/_nuxt/", "__nuxt", "nuxt.config"] },
  { name: "Angular", category: "framework", description: "TypeScript web framework by Google", confidence: 0.88, patterns: ["angular.js", "ng-version", "ng-app", "angular.min.js"] },
  { name: "Svelte", category: "framework", description: "Compile-time UI framework", confidence: 0.85, patterns: ["svelte", "__svelte"] },
  { name: "Gatsby", category: "framework", description: "React-based static site generator", confidence: 0.88, patterns: ["gatsby", "/static/", "___gatsby"] },
  { name: "Remix", category: "framework", description: "Full-stack React framework", confidence: 0.85, patterns: ["remix.run", "__remix"] },
  { name: "Astro", category: "framework", description: "Content-focused web framework", confidence: 0.85, patterns: ["astro", "/_astro/"] },

  // ── JavaScript Libraries ──
  { name: "jQuery", category: "jsLibrary", description: "Fast, small JavaScript library", confidence: 0.90, patterns: ["jquery.min.js", "jquery.js", "jquery-"] },
  { name: "Lodash", category: "jsLibrary", description: "JavaScript utility library", confidence: 0.80, patterns: ["lodash.min.js", "lodash.js", "lodash.core"] },
  { name: "Axios", category: "jsLibrary", description: "Promise-based HTTP client", confidence: 0.75, patterns: ["axios.min.js", "axios.js"] },
  { name: "Moment.js", category: "jsLibrary", description: "Date/time manipulation library", confidence: 0.78, patterns: ["moment.min.js", "moment.js", "moment-with-locales"] },
  { name: "GSAP", category: "jsLibrary", description: "GreenSock animation platform", confidence: 0.82, patterns: ["gsap.min.js", "gsap.js", "greensock", "tweenmax"] },
  { name: "Three.js", category: "jsLibrary", description: "3D graphics library", confidence: 0.82, patterns: ["three.min.js", "three.js", "threejs"] },
  { name: "Bootstrap", category: "jsLibrary", description: "CSS/JS UI framework", confidence: 0.85, patterns: ["bootstrap.min.css", "bootstrap.min.js", "bootstrap.bundle"] },
  { name: "Tailwind CSS", category: "jsLibrary", description: "Utility-first CSS framework", confidence: 0.80, patterns: ["tailwindcss", "tailwind.min.css"] },
  { name: "AWS SDK", category: "jsLibrary", description: "Amazon Web Services SDK for JavaScript", confidence: 0.80, patterns: ["aws-sdk", "amazonaws.com/sdk", "aws-amplify"] },

  // ── Analytics & Tracking ──
  { name: "Google Analytics", category: "analytics", description: "Web analytics by Google", confidence: 0.90, patterns: ["google-analytics.com", "googletagmanager.com/gtag", "analytics.js", "/ga.js"] },
  { name: "Google Tag Manager", category: "analytics", description: "Tag management system by Google", confidence: 0.88, patterns: ["googletagmanager.com/gtm", "gtm.js", "google_tag_manager"] },
  { name: "Google Analytics 4", category: "analytics", description: "Next-gen Google Analytics", confidence: 0.85, patterns: ["gtag('config', 'g-", "measurement_id", "google-analytics.com/g/collect"] },
  { name: "Facebook Pixel", category: "analytics", description: "Meta/Facebook conversion tracking", confidence: 0.88, patterns: ["connect.facebook.net", "fbq(", "facebook.com/tr", "fbevents.js"] },
  { name: "Hotjar", category: "analytics", description: "Heatmaps and session recordings", confidence: 0.85, patterns: ["hotjar.com", "hj(", "static.hotjar.com"] },
  { name: "Segment", category: "analytics", description: "Customer data platform", confidence: 0.82, patterns: ["segment.com", "analytics.js", "cdn.segment.com"] },
  { name: "Amplitude", category: "analytics", description: "Product analytics platform", confidence: 0.82, patterns: ["amplitude.com", "cdn.amplitude.com"] },
  { name: "Mixpanel", category: "analytics", description: "Product analytics for user behavior", confidence: 0.82, patterns: ["mixpanel.com", "cdn.mxpnl.com", "mixpanel.init"] },
  { name: "Heap", category: "analytics", description: "Behavioral analytics platform", confidence: 0.82, patterns: ["heap-", "heapanalytics.com", "cdn.heapanalytics.com"] },
  { name: "Microsoft Clarity", category: "analytics", description: "Free heatmaps and session replay by Microsoft", confidence: 0.82, patterns: ["clarity.ms", "clarity.js"] },
  { name: "Pinterest Tag", category: "analytics", description: "Pinterest conversion tracking", confidence: 0.80, patterns: ["pintrk(", "ct.pinterest.com", "s.pinimg.com/ct"] },
  { name: "TikTok Pixel", category: "analytics", description: "TikTok ads tracking pixel", confidence: 0.80, patterns: ["analytics.tiktok.com", "ttq.load"] },
  { name: "Snapchat Pixel", category: "analytics", description: "Snapchat conversion tracking", confidence: 0.78, patterns: ["sc-static.net/scevent", "snaptr("] },

  // ── Marketing & Personalization ──
  { name: "Optimizely", category: "marketing", description: "A/B testing and personalization", confidence: 0.85, patterns: ["optimizely.com", "cdn.optimizely.com", "optimizely.js"] },
  { name: "VWO", category: "marketing", description: "Visual Website Optimizer — A/B testing", confidence: 0.82, patterns: ["visualwebsiteoptimizer.com", "vwo_code", "dev.visualwebsiteoptimizer"] },
  { name: "Klaviyo", category: "marketing", description: "Email/SMS marketing automation", confidence: 0.85, patterns: ["klaviyo.com", "static.klaviyo.com", "_learnq"] },
  { name: "Mailchimp", category: "marketing", description: "Email marketing platform", confidence: 0.82, patterns: ["mailchimp.com", "chimpstatic.com", "mc.js"] },
  { name: "HubSpot", category: "marketing", description: "Inbound marketing and CRM", confidence: 0.85, patterns: ["js.hs-scripts.com", "js.hs-analytics.net", "hbspt.forms"] },
  { name: "Drift", category: "marketing", description: "Conversational marketing platform", confidence: 0.82, patterns: ["js.driftt.com", "drift.com"] },
  { name: "Intercom", category: "marketing", description: "Customer messaging platform", confidence: 0.85, patterns: ["intercom.io", "widget.intercom.io", "intercomcdn.com"] },
  { name: "Emplifi", category: "marketing", description: "Social media and CX platform (formerly Socialbakers)", confidence: 0.78, patterns: ["emplifi.io", "socialbakers.com"] },
  { name: "Iterable", category: "marketing", description: "Cross-channel marketing platform", confidence: 0.78, patterns: ["iterable.com", "js.iterable.com"] },
  { name: "Braze", category: "marketing", description: "Customer engagement platform", confidence: 0.78, patterns: ["braze.com", "sdk.iad-01.braze.com"] },

  // ── Widgets & Customer Support ──
  { name: "Zendesk", category: "widgets", description: "Customer service and support platform", confidence: 0.85, patterns: ["zdassets.com", "zendesk.com", "zopim.com", "static.zdassets.com"] },
  { name: "Freshdesk", category: "widgets", description: "Customer support software", confidence: 0.82, patterns: ["freshdesk.com", "freshchat.com"] },
  { name: "LiveChat", category: "widgets", description: "Live chat support widget", confidence: 0.82, patterns: ["livechatinc.com", "cdn.livechatinc.com"] },
  { name: "Tawk.to", category: "widgets", description: "Free live chat widget", confidence: 0.82, patterns: ["tawk.to", "embed.tawk.to"] },
  { name: "Crisp", category: "widgets", description: "Customer messaging platform", confidence: 0.80, patterns: ["crisp.chat", "client.crisp.chat"] },
  { name: "Qualtrics", category: "widgets", description: "Experience management / survey platform", confidence: 0.82, patterns: ["qualtrics.com", "siteintercept.qualtrics.com"] },
  { name: "Bazaarvoice", category: "widgets", description: "User-generated content and reviews", confidence: 0.85, patterns: ["bazaarvoice.com", "apps.bazaarvoice.com", "bvapi.com"] },
  { name: "Yotpo", category: "widgets", description: "Reviews and loyalty platform", confidence: 0.82, patterns: ["yotpo.com", "staticw2.yotpo.com"] },
  { name: "Trustpilot", category: "widgets", description: "Online review platform", confidence: 0.82, patterns: ["trustpilot.com", "widget.trustpilot.com"] },
  { name: "Judge.me", category: "widgets", description: "Product review app", confidence: 0.80, patterns: ["judge.me", "cdn.judge.me"] },
  { name: "Recaptcha", category: "widgets", description: "Google bot detection service", confidence: 0.85, patterns: ["google.com/recaptcha", "recaptcha.net", "grecaptcha"] },
  { name: "Cookie Consent", category: "widgets", description: "Cookie consent / GDPR banner", confidence: 0.75, patterns: ["cookieconsent", "cookie-consent", "onetrust.com", "cookiebot.com", "trustarc.com"] },

  // ── Search & Discovery ──
  { name: "Algolia", category: "search", description: "Search-as-a-service platform", confidence: 0.85, patterns: ["algolia.net", "algolianet.com", "algoliasearch"] },
  { name: "Searchspring", category: "search", description: "eCommerce search and merch", confidence: 0.80, patterns: ["searchspring.net", "searchspring.com"] },
  { name: "Klevu", category: "search", description: "AI-powered eCommerce search", confidence: 0.80, patterns: ["klevu.com", "js.klevu.com"] },
  { name: "Rapid Search", category: "search", description: "Instant search solution", confidence: 0.78, patterns: ["rapidsearch", "rapid-search"] },
  { name: "Elasticsearch", category: "search", description: "Distributed search engine", confidence: 0.75, patterns: ["elasticsearch", "elastic.co"] },

  // ── CDN & Performance ──
  { name: "Cloudflare", category: "cdn", description: "CDN, DDoS protection, and DNS", confidence: 0.80, patterns: ["cloudflare", "cdnjs.cloudflare.com", "cloudflare-static"] },
  { name: "Cloudflare Radar", category: "cdn", description: "Cloudflare web analytics", confidence: 0.75, patterns: ["radar.cloudflare.com", "static.cloudflareinsights.com", "cloudflareinsights"] },
  { name: "Fastly", category: "cdn", description: "Edge cloud platform / CDN", confidence: 0.80, patterns: ["fastly.net", "fastly.com"] },
  { name: "Akamai", category: "cdn", description: "Enterprise CDN and security", confidence: 0.80, patterns: ["akamai.net", "akamaized.net", "akam"] },
  { name: "Amazon CloudFront", category: "cdn", description: "AWS CDN service", confidence: 0.80, patterns: ["cloudfront.net", "d1.awsstatic.com"] },
  { name: "Vercel", category: "hosting", description: "Frontend deployment platform", confidence: 0.82, patterns: ["vercel.app", "vercel.com", "/_vercel/"] },
  { name: "Netlify", category: "hosting", description: "Web deployment and hosting", confidence: 0.82, patterns: ["netlify.app", "netlify.com", "netlify-cms"] },
  { name: "Google Fonts", category: "fonts", description: "Free web font hosting by Google", confidence: 0.85, patterns: ["fonts.googleapis.com", "fonts.gstatic.com"] },
  { name: "Adobe Fonts", category: "fonts", description: "Professional web fonts by Adobe", confidence: 0.82, patterns: ["use.typekit.net", "typekit.com", "p.typekit.net"] },
  { name: "Font Awesome", category: "fonts", description: "Icon font and SVG toolkit", confidence: 0.85, patterns: ["fontawesome", "font-awesome", "fa-solid", "fa-brands"] },

  // ── Media & Video ──
  { name: "YouTube Embed", category: "media", description: "YouTube video embeds", confidence: 0.85, patterns: ["youtube.com/embed", "youtube-nocookie.com", "ytimg.com"] },
  { name: "Vimeo", category: "media", description: "Video hosting platform", confidence: 0.85, patterns: ["vimeo.com", "player.vimeo.com", "vimeocdn.com"] },
  { name: "Wistia", category: "media", description: "Business video hosting", confidence: 0.82, patterns: ["wistia.com", "fast.wistia.com", "wistia-"] },

  // ── Security ──
  { name: "Sentry", category: "security", description: "Error monitoring and performance", confidence: 0.82, patterns: ["sentry.io", "browser.sentry-cdn.com", "sentry-"] },
  { name: "Datadog RUM", category: "security", description: "Real User Monitoring by Datadog", confidence: 0.80, patterns: ["datadoghq.com", "dd_rum", "datadog-rum"] },
  { name: "New Relic", category: "security", description: "Observability and monitoring", confidence: 0.80, patterns: ["newrelic.com", "nr-data.net", "nreum"] },
  { name: "LogRocket", category: "security", description: "Session replay and error tracking", confidence: 0.80, patterns: ["logrocket.com", "cdn.logrocket.com", "logrocket.io"] },
];

const CATEGORY_LABELS: Record<StackCategory, string> = {
  ecommerce: "eCommerce",
  cms: "CMS",
  framework: "Frontend Framework",
  jsLibrary: "JavaScript Libraries",
  analytics: "Analytics & Tracking",
  marketing: "Marketing & Personalization",
  widgets: "Widgets & Support",
  cdn: "Performance / CDN",
  hosting: "Hosting & Deployment",
  search: "Search & Discovery",
  security: "Monitoring & Security",
  fonts: "Fonts & Icons",
  media: "Media & Video",
  other: "Other",
};

export { CATEGORY_LABELS };

export function detectStack(html: string): StackSignalResult[] {
  const normalized = html.toLowerCase();
  const results: StackSignalResult[] = [];

  for (const sig of SIGNATURES) {
    const matchedSignals: string[] = [];

    for (const pattern of sig.patterns) {
      if (typeof pattern === "string") {
        if (normalized.includes(pattern.toLowerCase())) {
          matchedSignals.push(pattern);
        }
      } else if (pattern.test(normalized)) {
        matchedSignals.push(pattern.source);
      }
    }

    if (matchedSignals.length > 0) {
      const scaledConfidence = Math.min(
        sig.confidence + (matchedSignals.length - 1) * 0.03,
        0.99,
      );

      results.push({
        category: sig.category,
        detectedTool: sig.name,
        confidence: parseFloat(scaledConfidence.toFixed(2)),
        matchedSignals,
        description: sig.description,
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}
