export type ServiceId = "vercel" | "upstash" | "helius" | "pinata" | "xai" | "signer";

export type ServiceTier = {
  id: string;
  label: string;
  price: string;
  limits: Record<string, number>;
  notes: string;
  next?: string;
};

export type ServiceDef = {
  id: ServiceId;
  name: string;
  why: string;
  defaultTier: string;
  tiers: ServiceTier[];
};

/** Plan ceilings we actually hit. Numbers match public Hobby / free-tier docs. */
export const SERVICES: ServiceDef[] = [
  {
    id: "vercel",
    name: "Vercel",
    why: "Hosts the site, APIs, and cron. Hobby only fires the bot once a day.",
    defaultTier: "hobby",
    tiers: [
      {
        id: "hobby",
        label: "Hobby",
        price: "$0",
        limits: { cronPerDay: 1, fnSeconds: 10, bandwidthGb: 100 },
        notes: "Cron is daily. 24/7 live clips need Pro minute cron.",
        next: "pro",
      },
      {
        id: "pro",
        label: "Pro",
        price: "$20/mo",
        limits: { cronPerDay: 1440, fnSeconds: 60, bandwidthGb: 1024 },
        notes: "Minute cron, longer functions, 1 TB bandwidth.",
      },
    ],
  },
  {
    id: "upstash",
    name: "Upstash Redis",
    why: "Durable books, tape, and seats. Vercel /tmp dies between deploys.",
    defaultTier: "free",
    tiers: [
      {
        id: "free",
        label: "Free",
        price: "$0",
        limits: { storageMb: 256, commandsPerDay: 10_000 },
        notes: "256 MB and 10k commands/day. Upgrade when books or the tape grow.",
        next: "payg",
      },
      {
        id: "payg",
        label: "Pay as you go",
        price: "usage",
        limits: { storageMb: 1024, commandsPerDay: 1_000_000 },
        notes: "Paid Redis. Raise the cap here if you buy more.",
      },
    ],
  },
  {
    id: "helius",
    name: "Helius RPC",
    why: "Solana reads and sends. Public RPC is too flaky for live swaps.",
    defaultTier: "free",
    tiers: [
      {
        id: "free",
        label: "Free",
        price: "$0",
        limits: { creditsPerMonth: 100_000 },
        notes: "100k credits/month. Quotes and balances chew this.",
        next: "developer",
      },
      {
        id: "developer",
        label: "Developer",
        price: "$49/mo",
        limits: { creditsPerMonth: 10_000_000 },
        notes: "Headroom for live desks and the tape.",
        next: "business",
      },
      {
        id: "business",
        label: "Business",
        price: "custom",
        limits: { creditsPerMonth: 100_000_000 },
        notes: "Dedicated throughput if the desk is hot.",
      },
    ],
  },
  {
    id: "pinata",
    name: "Pinata IPFS",
    why: "Token art and media. Keeps fat data-URLs out of Redis.",
    defaultTier: "free",
    tiers: [
      {
        id: "free",
        label: "Free",
        price: "$0",
        limits: { storageGb: 1, files: 500, bandwidthGb: 10, rpm: 60 },
        notes: "1 GB, 500 files, 10 GB bandwidth, 60 req/min.",
        next: "picnic",
      },
      {
        id: "picnic",
        label: "Picnic",
        price: "$20/mo",
        limits: { storageGb: 1024, files: 5_000_000, bandwidthGb: 500, rpm: 250 },
        notes: "1 TB, CDN gateway. Next stop if launch art fills the free pin.",
        next: "fiesta",
      },
      {
        id: "fiesta",
        label: "Fiesta",
        price: "$100/mo",
        limits: { storageGb: 5120, files: 10_000_000, bandwidthGb: 2560, rpm: 500 },
        notes: "5 TB and 2.5 TB bandwidth.",
      },
    ],
  },
  {
    id: "xai",
    name: "xAI",
    why: "Content bot copy. No key means she cannot write posts.",
    defaultTier: "none",
    tiers: [
      {
        id: "none",
        label: "Off",
        price: "$0",
        limits: { requestsPerDay: 0 },
        notes: "Set XAI_API_KEY to turn the content bot on.",
        next: "grok",
      },
      {
        id: "grok",
        label: "Grok key",
        price: "usage",
        limits: { requestsPerDay: 10_000 },
        notes: "Key present. Watch spend on the xAI console.",
      },
    ],
  },
  {
    id: "signer",
    name: "Live signer",
    why: "Encrypted trading-wallet key so she clips with the tab closed.",
    defaultTier: "off",
    tiers: [
      {
        id: "off",
        label: "Off",
        price: "$0",
        limits: { liveClips: 0 },
        notes: "LIVE_SIGNER_SECRET missing. Live 24/7 cannot sign.",
        next: "on",
      },
      {
        id: "on",
        label: "Ready",
        price: "included",
        limits: { liveClips: 10_000 },
        notes: "Signer secret is set. Still needs Vercel Pro for minute ticks.",
      },
    ],
  },
];

export type HealthTiers = Partial<Record<ServiceId, string>>;

export function tierOf(service: ServiceDef, picked?: string): ServiceTier {
  return service.tiers.find((t) => t.id === picked) || service.tiers.find((t) => t.id === service.defaultTier) || service.tiers[0];
}

export function nextTier(service: ServiceDef, picked?: string): ServiceTier | null {
  const cur = tierOf(service, picked);
  if (!cur.next) return null;
  return service.tiers.find((t) => t.id === cur.next) || null;
}
