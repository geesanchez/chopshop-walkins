import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/join"],
        disallow: ["/api/", "/kiosk", "/staff", "/display"],
      },
    ],
    sitemap: "https://thechopshopwatsonville.com/sitemap.xml",
  };
}
