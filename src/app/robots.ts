import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/join"],
        disallow: ["/api/", "/kiosk", "/staff", "/display"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "anthropic-ai",
          "Claude-Web",
          "Google-Extended",
          "FacebookBot",
          "Bytespider",
          "cohere-ai",
        ],
        disallow: "/",
      },
    ],
    sitemap: "https://queue.thechopshopwatsonville.com/sitemap.xml",
  };
}
