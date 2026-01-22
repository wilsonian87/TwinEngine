/**
 * OmniVor Labs Brand Components & Context
 *
 * Centralized exports for all brand-specific components, context, and hooks.
 *
 * Components:
 * - Wordmark, WordmarkCompact, WordmarkDisplay - Logo variants
 * - LogoIcon - Standalone icon
 *
 * Context & Hooks:
 * - BrandProvider - Wrap app to enable brand context
 * - useBrand - Full brand context access
 * - useTagline - Current session tagline
 * - useModuleName - Get module display names
 * - useBrandColors - Get brand color palette
 * - useBrandCopy - Get brand copy text
 */

// Components
export {
  Wordmark,
  WordmarkCompact,
  WordmarkDisplay,
  LogoIcon,
  type WordmarkVariant,
  type WordmarkSize,
} from "./Wordmark";

// Context & Hooks
export {
  BrandProvider,
  useBrand,
  useTagline,
  useModuleName,
  useBrandColors,
  useBrandCopy,
} from "./BrandContext";
