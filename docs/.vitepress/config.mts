import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Daizer Documentation",
  description: "Technical documentation for Daizer admin and user dashboards.",
  lastUpdated: true,
  themeConfig: {
    siteTitle: "Daizer Docs",
    nav: [
      { text: "Home", link: "/" },
      { text: "Admin Dashboard", link: "/admin-dashboard/README" },
      { text: "User Dashboard", link: "/user-dashboard/README" }
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [{ text: "Overview", link: "/" }]
      },
      {
        text: "Admin Dashboard",
        items: [
          { text: "Overview", link: "/admin-dashboard/README" },
          { text: "User Management", link: "/admin-dashboard/user-management" },
          { text: "Pricing Group", link: "/admin-dashboard/pricing-group" },
          { text: "Wallet Management", link: "/admin-dashboard/wallet-management" },
          { text: "Orders & Products", link: "/admin-dashboard/orders-products" },
          { text: "API Configuration", link: "/admin-dashboard/api-configuration" },
          { text: "Platform Settings", link: "/admin-dashboard/platform-settings" }
        ]
      },
      {
        text: "User Dashboard",
        items: [
          { text: "Overview", link: "/user-dashboard/README" },
          { text: "Wallet Management", link: "/user-dashboard/wallet-management" },
          { text: "Product Browsing", link: "/user-dashboard/product-browsing" }
        ]
      }
    ],
    footer: {
      message: "Daizer internal technical docs",
      copyright: "Copyright © Daizer"
    }
  }
});
