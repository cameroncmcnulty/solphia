import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemeCoinSite } from "@/components/MemeCoinSite";
import { findProjectByHandle, publicSitePack } from "@/lib/tools/v3/project";
import { v3HandleOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const handle = v3HandleOf(ticker);
  const p = await findProjectByHandle(handle).catch(() => null);
  const name = p?.id ? p.name : handle.toUpperCase();
  const symbol = p?.id ? p.symbol : handle.toUpperCase();
  const title = `$${symbol} · ${name}`;
  const description = p?.tagline || p?.blurb || `${name} on Solana.`;
  const image = p?.image || `/api/m/${handle}/art`;
  const hero = p?.heroImage && p.heroImage.startsWith("http") ? p.heroImage : image;
  const wide = hero !== image;
  return {
    title: { absolute: title },
    description,
    applicationName: name,
    openGraph: {
      title,
      description,
      url: p?.website,
      siteName: name,
      images: [{ url: hero, width: wide ? 1200 : 256, height: wide ? 630 : 256 }],
      type: "website",
    },
    twitter: {
      card: wide ? "summary_large_image" : "summary",
      title,
      description,
      images: [hero],
    },
  };
}

export default async function MemeTickerPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const handle = v3HandleOf(ticker);
  const p = await findProjectByHandle(handle);
  if (!p?.id) notFound();
  return <MemeCoinSite initial={publicSitePack(p)} ticker={handle} />;
}
