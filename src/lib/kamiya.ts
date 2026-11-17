import type { Locale } from "@/i18n";

/**
 * Mieko Kamiya's needs for ikigai, as described in "Ikigai ni tsuite" (1966).
 * English renderings are our own paraphrases, not quotations.
 */
export type NeedKey =
  | "fulfillment"
  | "change_growth"
  | "future"
  | "response"
  | "freedom"
  | "self_realization"
  | "meaning_value";

type L = Record<Locale, string>;
export const NEEDS: { key: NeedKey; jp: string; name: L; desc: L }[] = [
  {
    key: "fulfillment",
    jp: "生存充実感",
    name: { en: "A sense of fulfilment in living", uk: "Відчуття наповненості життя" },
    desc: {
      en: "Feeling that your days are full and alive — that you are truly living, not just getting through.",
      uk: "Відчуття, що ваші дні наповнені й живі — що ви справді живете, а не просто перебуваєте.",
    },
  },
  {
    key: "change_growth",
    jp: "変化と成長",
    name: { en: "Change and growth", uk: "Зміни та зростання" },
    desc: {
      en: "Freshness, learning and the feeling of moving forward rather than standing still.",
      uk: "Новизна, навчання і відчуття руху вперед, а не застою.",
    },
  },
  {
    key: "future",
    jp: "未来性",
    name: { en: "A future to look towards", uk: "Майбутнє, до якого прагнеш" },
    desc: {
      en: "Having hopes, plans or something ahead of you that draws you onward.",
      uk: "Мати надії, плани чи щось попереду, що вабить вас уперед.",
    },
  },
  {
    key: "response",
    jp: "反響",
    name: { en: "Response from others", uk: "Відгук інших" },
    desc: {
      en: "Connection, sympathy and recognition — feeling that your presence matters to someone.",
      uk: "Зв’язок, співчуття і визнання — відчуття, що ваша присутність комусь важлива.",
    },
  },
  {
    key: "freedom",
    jp: "自由",
    name: { en: "Freedom", uk: "Свобода" },
    desc: {
      en: "Room to choose your own way and to act from your own will.",
      uk: "Простір обирати власний шлях і діяти з власної волі.",
    },
  },
  {
    key: "self_realization",
    jp: "自己実現",
    name: { en: "Self-realisation", uk: "Самореалізація" },
    desc: {
      en: "Expressing and developing what is uniquely yours — your capacities and character.",
      uk: "Виявляти й розвивати те, що властиве саме вам, — ваші здібності й характер.",
    },
  },
  {
    key: "meaning_value",
    jp: "意味と価値",
    name: { en: "Meaning and value", uk: "Сенс і цінність" },
    desc: {
      en: "Sensing that your life has meaning and that what you do is of value.",
      uk: "Відчуття, що ваше життя має сенс, а те, що ви робите, — цінність.",
    },
  },
];

export type ModuleKey = "aliveness" | "connection" | "freedom" | "meaning";

/** Four AI-guided modules, each grouping related Kamiya needs. */
export const MODULES: { key: ModuleKey; needs: NeedKey[]; title: L; intro: L; tone: string }[] = [
  {
    key: "aliveness",
    needs: ["fulfillment", "change_growth"],
    title: { en: "Aliveness & Growth", uk: "Жвавість і зростання" },
    intro: {
      en: "When do you feel most alive? Explore the moments, activities and changes that give your days fullness.",
      uk: "Коли ви почуваєтеся найбільш живими? Дослідіть моменти, заняття та зміни, що наповнюють ваші дні.",
    },
    tone: "bg-blush",
  },
  {
    key: "connection",
    needs: ["response"],
    title: { en: "Connection & Response", uk: "Зв’язок і відгук" },
    intro: {
      en: "Who and what responds to you? Reflect on the relationships and contributions where you feel seen and needed.",
      uk: "Хто і що відгукується на вас? Поміркуйте про стосунки й внесок, де ви почуваєтеся побаченими й потрібними.",
    },
    tone: "bg-lavender",
  },
  {
    key: "freedom",
    needs: ["freedom", "self_realization"],
    title: { en: "Freedom & Self-Realisation", uk: "Свобода і самореалізація" },
    intro: {
      en: "Where do you act from your own will? Explore your strengths, interests and what is uniquely yours to express.",
      uk: "Де ви дієте з власної волі? Дослідіть свої сильні сторони, інтереси й те, що лише ви можете виразити.",
    },
    tone: "bg-sage",
  },
  {
    key: "meaning",
    needs: ["future", "meaning_value"],
    title: { en: "Future, Meaning & Value", uk: "Майбутнє, сенс і цінність" },
    intro: {
      en: "What gives your life meaning, and what are you moving towards? Reflect on your values and the future that draws you.",
      uk: "Що надає вашому життю сенсу і до чого ви рухаєтеся? Поміркуйте про свої цінності та майбутнє, яке вас вабить.",
    },
    tone: "bg-[#F1EBE3]",
  },
];

export const isModuleKey = (k: string | undefined): k is ModuleKey =>
  !!k && MODULES.some((m) => m.key === k);
export const getModule = (k: ModuleKey) => MODULES.find((m) => m.key === k)!;
export const needName = (k: string, l: Locale) => NEEDS.find((n) => n.key === k)?.name[l] ?? k;

export const REFLECTION_FIELDS = [
  "key_discoveries",
  "recurring_themes",
  "supporting_examples",
  "open_questions",
  "further_exploration",
] as const;
export type ReflectionField = (typeof REFLECTION_FIELDS)[number];
export type ReflectionItem = { text: string; evidence?: string };

export const MIN_USER_MESSAGES_FOR_SUMMARY = 2;
