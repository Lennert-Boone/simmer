import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Simmer — weekmenu voor het gezin",
    short_name: "Simmer",
    description: "Samen een weekmenu opstellen, met wat er al in huis is.",
    lang: "nl",
    start_url: "/week",
    display: "standalone",
    background_color: "#F6F5F1",
    theme_color: "#3F6B4F",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
