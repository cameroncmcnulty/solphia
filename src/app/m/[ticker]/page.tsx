import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemeCoinSite } from "@/components/MemeCoinSite";
import { loadProject, publicSitePack } from "@/lib/tools/v3/project";
import { v3HandleOf } from "@/lib/tools/v3/host";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const handle = v3HandleOf(ticker);
  const p = await loadProject().catch(() => null);
  const match = p && (p.handle === handle || p.symbol.toLowerCase() === handle);
  const name = match ? p.name : handle.toUpperCase();
  const symbol = match ? p.symbol : handle.toUpperCase();
  const title = `$${symbol} · ${name}`;
  const description = match ? p.blurb : `${name} on Solana.`;
  const image = match ? p.image : `/api/m/${handle}/art`;
  return {
    title: { absolute: title },
    description,
    applicationName: name,
    openGraph: {
      title,
      description,
      url: match ? p.website : undefined,
      siteName: name,
      images: [{ url: image, width: 256, height: 256 }],
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [image],
    },
  };
}

export default async function MemeTickerPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const handle = v3HandleOf(ticker);
  const p = await loadProject();
  if (!p.id || (p.handle !== handle && p.symbol.toLowerCase() !== handle)) notFound();
  return <MemeCoinSite initial={publicSitePack(p)} ticker={handle} />;
}
