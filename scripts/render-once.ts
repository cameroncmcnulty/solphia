import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { localPack } from "../src/lib/content/copy";
import { paintPhoto, renderShot } from "../src/lib/content/render";

async function main() {
  const shots = localPack(Date.now(), "face poster");
  const outDir = path.join(process.cwd(), "data", "promos");
  fs.mkdirSync(outDir, { recursive: true });
  shots.push({
    ...shots[0],
    aspect: "16:9",
    layout: "desk",
    art: { ...shots[0].art, fit: "left", compose: "bleed-side" },
  });
  for (const shot of shots) {
    const buf = await renderShot(shot);
    const file = path.join(outDir, `preview-${shot.aspect.replace(":", "x")}-${shot.layout}.png`);
    fs.writeFileSync(file, buf);
    const png = PNG.sync.read(buf);
    const photo = paintPhoto(shot, png.width, png.height);
    console.log(
      JSON.stringify({
        layout: shot.layout,
        aspect: shot.aspect,
        canvas: `${png.width}x${png.height}`,
        photo: `${photo.width}x${photo.height}`,
        bytes: buf.length,
        file,
        headline: shot.headline,
      }),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
