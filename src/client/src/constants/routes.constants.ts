import { ArrowLeftRight, ChartPie, FileSpreadsheet, Home, Landmark, Settings, Tags, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { title: "Home", url: "/home", icon: Home },
      { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
      { title: "Reports", url: "/reports", icon: ChartPie },
      { title: "Import", url: "/import", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Masters",
    items: [
      { title: "Categories", url: "/categories", icon: Tags },
      { title: "Accounts", url: "/accounts", icon: Landmark },
    ],
  },
];

export const settingsNavItem: NavItem = { title: "Settings", url: "/settings", icon: Settings };
