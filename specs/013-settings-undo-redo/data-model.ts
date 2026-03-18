// --- Types ---

export type Theme = "light" | "dark" | "system";
export type AccentColor = "blue" | "green" | "red" | "purple" | "orange" | "teal";
export type FontFamily = "sans-serif" | "serif" | "monospace";
export type SidebarPosition = "left" | "right";
export type ContentWidth = "narrow" | "medium" | "wide";
export type NotificationFrequency = "immediate" | "hourly" | "daily";

export interface AppearanceSettings {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: number; // 12-24
  fontFamily: FontFamily;
}

export interface LayoutSettings {
  sidebarPosition: SidebarPosition;
  showHeader: boolean;
  showFooter: boolean;
  contentWidth: ContentWidth;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: NotificationFrequency;
}

export interface Settings {
  appearance: AppearanceSettings;
  layout: LayoutSettings;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  appearance: {
    theme: "light",
    accentColor: "blue",
    fontSize: 16,
    fontFamily: "sans-serif",
  },
  layout: {
    sidebarPosition: "left",
    showHeader: true,
    showFooter: true,
    contentWidth: "medium",
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    notificationFrequency: "immediate",
  },
};

export const ACCENT_COLORS: Record<AccentColor, string> = {
  blue: "#3498db",
  green: "#2ecc71",
  red: "#e74c3c",
  purple: "#9b59b6",
  orange: "#e67e22",
  teal: "#1abc9c",
};

export const CONTENT_WIDTHS: Record<ContentWidth, string> = {
  narrow: "480px",
  medium: "720px",
  wide: "960px",
};
