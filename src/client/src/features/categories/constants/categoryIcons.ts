import {
  Baby, Banknote, Briefcase, Bus, Car, Circle, Coffee, CreditCard, Droplet, Dumbbell, Film, Flame,
  Fuel, Gamepad2, Gift, GraduationCap, HandCoins, HeartPulse, House, Landmark, Laptop, Music, PawPrint,
  Percent, PiggyBank, Pill, Plane, Receipt, Repeat, Scissors, Shield, Shirt, ShoppingBag, ShoppingCart,
  Smartphone, TrendingUp, Undo2, Utensils, Wallet, Wifi, Wrench, Zap, type LucideIcon,
} from "lucide-react";

export interface CategoryIconOption {
  /** Stored on the server: the Lucide icon name in kebab-case. */
  name: string;
  label: string;
  icon: LucideIcon;
}

export const categoryIcons: CategoryIconOption[] = [
  { name: "shopping-cart", label: "Groceries", icon: ShoppingCart },
  { name: "utensils", label: "Dining", icon: Utensils },
  { name: "coffee", label: "Coffee", icon: Coffee },
  { name: "fuel", label: "Fuel", icon: Fuel },
  { name: "car", label: "Car", icon: Car },
  { name: "bus", label: "Transport", icon: Bus },
  { name: "plane", label: "Travel", icon: Plane },
  { name: "house", label: "Rent / Home", icon: House },
  { name: "zap", label: "Electricity", icon: Zap },
  { name: "droplet", label: "Water", icon: Droplet },
  { name: "flame", label: "Gas", icon: Flame },
  { name: "smartphone", label: "Phone", icon: Smartphone },
  { name: "wifi", label: "Internet", icon: Wifi },
  { name: "wrench", label: "Repairs", icon: Wrench },
  { name: "heart-pulse", label: "Health", icon: HeartPulse },
  { name: "pill", label: "Medicine", icon: Pill },
  { name: "shield", label: "Insurance", icon: Shield },
  { name: "graduation-cap", label: "Education", icon: GraduationCap },
  { name: "shopping-bag", label: "Shopping", icon: ShoppingBag },
  { name: "shirt", label: "Clothing", icon: Shirt },
  { name: "film", label: "Movies", icon: Film },
  { name: "gamepad-2", label: "Games", icon: Gamepad2 },
  { name: "music", label: "Music", icon: Music },
  { name: "gift", label: "Gifts", icon: Gift },
  { name: "paw-print", label: "Pets", icon: PawPrint },
  { name: "baby", label: "Kids", icon: Baby },
  { name: "scissors", label: "Personal care", icon: Scissors },
  { name: "repeat", label: "Subscriptions", icon: Repeat },
  { name: "dumbbell", label: "Fitness", icon: Dumbbell },
  { name: "receipt", label: "Bills / Taxes", icon: Receipt },
  { name: "landmark", label: "Bank fees", icon: Landmark },
  { name: "credit-card", label: "Credit card bill", icon: CreditCard },
  { name: "hand-coins", label: "Loan / EMI", icon: HandCoins },
  { name: "briefcase", label: "Salary", icon: Briefcase },
  { name: "laptop", label: "Freelance", icon: Laptop },
  { name: "percent", label: "Interest", icon: Percent },
  { name: "trending-up", label: "Investments", icon: TrendingUp },
  { name: "piggy-bank", label: "Savings", icon: PiggyBank },
  { name: "undo-2", label: "Refunds", icon: Undo2 },
  { name: "banknote", label: "Cash", icon: Banknote },
  { name: "wallet", label: "Wallet", icon: Wallet },
  { name: "circle", label: "Other", icon: Circle },
];

const iconsByName = new Map(categoryIcons.map((o) => [o.name, o.icon]));

/** Unknown names (e.g. an icon removed from this list later) fall back to a plain circle. */
export function getCategoryIcon(name: string): LucideIcon {
  return iconsByName.get(name) ?? Circle;
}
