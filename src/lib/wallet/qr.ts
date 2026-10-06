import { encode, renderSVG } from "uqr";

export function qrMatrix(text: string): boolean[][] {
  const q = encode(text, { ecc: "M" });
  return q.data as boolean[][];
}

export function qrSvg(text: string, color = "#ffffff"): string {
  return renderSVG(text, {
    ecc: "M",
    border: 2,
    blackColor: color,
    whiteColor: "transparent",
  });
}
