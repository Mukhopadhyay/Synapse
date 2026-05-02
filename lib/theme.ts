/**
 * Centralized theme color palette.
 *
 * Every accent color used across the app — Tailwind classes, D3 fills,
 * inline styles — should derive from these values so the theme can be
 * changed in one place.
 *
 * For Tailwind classes the matching CSS custom properties live in
 * globals.css (`--color-accent-theme-*`).  This file provides the same
 * palette as plain strings for contexts that can't use CSS vars (D3
 * canvas, inline `style` props, etc.).
 */

export const theme = {
  /** Primary accent — red-600 */
  accent: "#dc2626",
  /** Lighter accent — red-400 */
  accentLight: "#f87171",
  /** Darker accent — red-700 */
  accentDark: "#b91c1c",
  /** Mid-bright accent — red-500 */
  accentBright: "#ef4444",
} as const;
