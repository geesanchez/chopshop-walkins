import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";
import { SHOP } from "@/lib/shop-config";

export const alt = "The Chop Shop — Walk-in Queue";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logoData = await readFile(join(process.cwd(), "public", "logo.jpeg"));
  const logoBase64 = `data:image/jpeg;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <img
          src={logoBase64}
          alt=""
          width={160}
          height={160}
          style={{ borderRadius: 80 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            color: "#d9a61a",
            lineHeight: 1.1,
            marginTop: 24,
          }}
        >
          {SHOP.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#999999",
            marginTop: 16,
          }}
        >
          Walk-in Queue — Join the line from anywhere
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#666666",
            marginTop: 12,
          }}
        >
          {SHOP.address} · {SHOP.hours.short}
        </div>
      </div>
    ),
    { ...size }
  );
}
