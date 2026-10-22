import { getDictionary, type Language } from "@/lib/i18n";

export type Locale = Language;

export type Localized = { id: string; en: string };

export type HelpItem = { heading: Localized; body: Localized };

export type HelpPageData = {
  title: Localized;
  subtitle: Localized;
  items: HelpItem[];
};

export type HelpPageKind = "faq" | "sections" | "contact" | "seller";

export type HelpPageDef = {
  slug: string;
  kind: HelpPageKind;
  labelKey: string;
  build: () => HelpPageData;
};

export function tr(value: Localized | undefined, language: Language): string {
  if (!value) return "";
  return value[language] || value.id || value.en || "";
}

function loc(idKey: string, enKey?: string): Localized {
  const id = getDictionary("id");
  const en = getDictionary("en");
  return {
    id: id[idKey] ?? idKey,
    en: (enKey ? en[enKey] : undefined) ?? en[idKey] ?? id[idKey] ?? idKey,
  };
}

function item(headingId: string, headingEn: string, bodyId: string, bodyEn: string): HelpItem {
  return { heading: loc(headingId, headingEn), body: loc(bodyId, bodyEn) };
}

export const HELP_PAGES: HelpPageDef[] = [
  {
    slug: "faq",
    kind: "faq",
    labelKey: "admin.helpFaq",
    build: () => ({
      title: loc("faqPage.title"),
      subtitle: loc("faqPage.subtitle"),
      items: [
        item("help.faq1Q", "help.faq1Q", "help.faq1A", "help.faq1A"),
        item("help.faq2Q", "help.faq2Q", "help.faq2A", "help.faq2A"),
        item("help.faq3Q", "help.faq3Q", "help.faq3A", "help.faq3A"),
        item("help.faq4Q", "help.faq4Q", "help.faq4A", "help.faq4A"),
        item("help.faq5Q", "help.faq5Q", "help.faq5A", "help.faq5A"),
        item("help.faq6Q", "help.faq6Q", "help.faq6A", "help.faq6A"),
      ],
    }),
  },
  {
    slug: "syarat-ketentuan",
    kind: "sections",
    labelKey: "admin.helpTos",
    build: () => ({
      title: loc("tosPage.title"),
      subtitle: loc("tosPage.subtitle"),
      items: [
        item("help.tos1Title", "help.tos1Title", "help.tos1Desc", "help.tos1Desc"),
        item("help.tos2Title", "help.tos2Title", "help.tos2Desc", "help.tos2Desc"),
        item("help.tos3Title", "help.tos3Title", "help.tos3Desc", "help.tos3Desc"),
        item("help.tos4Title", "help.tos4Title", "help.tos4Desc", "help.tos4Desc"),
        item("help.tos5Title", "help.tos5Title", "help.tos5Desc", "help.tos5Desc"),
        item("help.tos6Title", "help.tos6Title", "help.tos6Desc", "help.tos6Desc"),
      ],
    }),
  },
  {
    slug: "kebijakan-privasi",
    kind: "sections",
    labelKey: "admin.helpPrivacy",
    build: () => ({
      title: loc("privacyPage.title"),
      subtitle: loc("privacyPage.subtitle"),
      items: [
        item("help.privacy1Title", "help.privacy1Title", "help.privacy1Desc", "help.privacy1Desc"),
        item("help.privacy2Title", "help.privacy2Title", "help.privacy2Desc", "help.privacy2Desc"),
        item("help.privacy3Title", "help.privacy3Title", "help.privacy3Desc", "help.privacy3Desc"),
        item("help.privacy4Title", "help.privacy4Title", "help.privacy4Desc", "help.privacy4Desc"),
        item("help.privacy5Title", "help.privacy5Title", "help.privacy5Desc", "help.privacy5Desc"),
      ],
    }),
  },
  {
    slug: "hubungi-cs",
    kind: "contact",
    labelKey: "admin.helpContact",
    build: () => ({
      title: loc("contactPage.title"),
      subtitle: loc("contactPage.subtitle"),
      items: [
        { heading: loc("help.liveChat"), body: loc("help.csDaily") },
        { heading: { id: "Email", en: "Email" }, body: { id: "esmodkeisya@gmail.com", en: "esmodkeisya@gmail.com" } },
        { heading: loc("help.phone"), body: { id: "0877-4608-0586", en: "0877-4608-0586" } },
        { heading: loc("contactPage.address"), body: { id: "Malang, Indonesia", en: "Malang, Indonesia" } },
        { heading: loc("contactPage.hours"), body: { id: "08.00–20.00", en: "08.00–20.00" } },
      ],
    }),
  },
  {
    slug: "bantuan-penjual",
    kind: "seller",
    labelKey: "admin.helpSeller",
    build: () => ({
      title: loc("sellerHelp.title"),
      subtitle: loc("sellerHelp.subtitle"),
      items: [
        item("sellerHelp.faq1Q", "sellerHelp.faq1Q", "sellerHelp.faq1A", "sellerHelp.faq1A"),
        item("sellerHelp.faq2Q", "sellerHelp.faq2Q", "sellerHelp.faq2A", "sellerHelp.faq2A"),
        item("sellerHelp.faq3Q", "sellerHelp.faq3Q", "sellerHelp.faq3A", "sellerHelp.faq3A"),
        item("sellerHelp.faq4Q", "sellerHelp.faq4Q", "sellerHelp.faq4A", "sellerHelp.faq4A"),
      ],
    }),
  },
];

export function getHelpPageDef(slug: string): HelpPageDef | undefined {
  return HELP_PAGES.find((page) => page.slug === slug);
}

export function defaultHelpPage(slug: string): HelpPageData | null {
  const def = getHelpPageDef(slug);
  return def ? def.build() : null;
}

const EMPTY_LOCALIZED: Localized = { id: "", en: "" };

function mergeLocalized(def: Localized | undefined, value: unknown): Localized {
  const fallback = def ?? EMPTY_LOCALIZED;
  if (value && typeof value === "object") {
    const obj = value as Partial<Localized>;
    return {
      id: typeof obj.id === "string" ? obj.id : fallback.id,
      en: typeof obj.en === "string" ? obj.en : fallback.en,
    };
  }
  return fallback;
}

export function mergeHelpPage(base: HelpPageData | null, remote: unknown): HelpPageData {
  const fallback: HelpPageData =
    base ?? { title: EMPTY_LOCALIZED, subtitle: EMPTY_LOCALIZED, items: [] };
  if (!remote || typeof remote !== "object" || Array.isArray(remote)) return fallback;
  const data = remote as Partial<HelpPageData>;
  const items = Array.isArray(data.items)
    ? data.items.map((raw, index) => {
        const def = fallback.items[index];
        const entry = (raw ?? {}) as Partial<HelpItem>;
        return {
          heading: mergeLocalized(def?.heading, entry.heading),
          body: mergeLocalized(def?.body, entry.body),
        };
      })
    : fallback.items;
  return {
    title: mergeLocalized(fallback.title, data.title),
    subtitle: mergeLocalized(fallback.subtitle, data.subtitle),
    items,
  };
}
