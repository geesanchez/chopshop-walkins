import type { MetadataRoute } from "next";
import { SHOP } from "@/lib/shop-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SHOP.domain,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SHOP.domain}/join`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SHOP.domain}/privacy`,
      lastModified: "2026-03-09",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SHOP.domain}/terms`,
      lastModified: "2026-03-09",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
