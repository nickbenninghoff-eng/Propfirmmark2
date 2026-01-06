export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "PropFirm",
  description: "Start your funded trading journey. Trade futures with our capital and keep up to 80% of your profits.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og-image.png",
  links: {
    twitter: "https://twitter.com/propfirm",
    discord: "https://discord.gg/propfirm",
  },
  creator: "PropFirm Team",
  keywords: [
    "prop trading",
    "funded trading",
    "futures trading",
    "trading evaluation",
    "prop firm",
  ],
};

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#faq", label: "FAQ" },
];

export const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/accounts", label: "My Accounts", icon: "Wallet" },
  { href: "/statistics", label: "Statistics", icon: "BarChart3" },
  { href: "/payouts", label: "Payouts", icon: "DollarSign" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

export const adminLinks = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/accounts", label: "Accounts", icon: "Wallet" },
  { href: "/admin/tiers", label: "Tiers", icon: "Layers" },
  { href: "/admin/payouts", label: "Payouts", icon: "DollarSign" },
  { href: "/admin/analytics", label: "Analytics", icon: "TrendingUp" },
];
