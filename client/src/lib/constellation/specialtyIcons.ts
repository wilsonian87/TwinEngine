/**
 * Specialty Icons Configuration
 *
 * Maps HCP specialties to Lucide icons and colors for L3 HCP Constellation view.
 * For 3D rendering, we use abbreviation badges instead of complex icons
 * to reduce GPU load while maintaining specialty identification.
 */

import {
  Heart,
  Brain,
  Stethoscope,
  Pill,
  Baby,
  Eye,
  Ear,
  Microscope,
  Shield,
  Syringe,
  Flame,
  Wind,
  Droplets,
  Bone,
  type LucideIcon,
} from 'lucide-react';

export interface SpecialtyConfig {
  icon: LucideIcon;
  color: string;
  abbr: string;
  label: string;
}

export const SPECIALTY_ICONS: Record<string, SpecialtyConfig> = {
  Oncology: {
    icon: Flame,
    color: '#8B5CF6',
    abbr: 'ONC',
    label: 'Oncology',
  },
  Cardiology: {
    icon: Heart,
    color: '#EF4444',
    abbr: 'CARD',
    label: 'Cardiology',
  },
  Neurology: {
    icon: Brain,
    color: '#3B82F6',
    abbr: 'NEU',
    label: 'Neurology',
  },
  Pulmonology: {
    icon: Wind,
    color: '#06B6D4',
    abbr: 'PULM',
    label: 'Pulmonology',
  },
  Rheumatology: {
    icon: Bone,
    color: '#F59E0B',
    abbr: 'RHEUM',
    label: 'Rheumatology',
  },
  Endocrinology: {
    icon: Pill,
    color: '#10B981',
    abbr: 'ENDO',
    label: 'Endocrinology',
  },
  Pediatrics: {
    icon: Baby,
    color: '#EC4899',
    abbr: 'PEDS',
    label: 'Pediatrics',
  },
  Ophthalmology: {
    icon: Eye,
    color: '#6366F1',
    abbr: 'OPH',
    label: 'Ophthalmology',
  },
  ENT: {
    icon: Ear,
    color: '#14B8A6',
    abbr: 'ENT',
    label: 'ENT',
  },
  'Primary Care': {
    icon: Stethoscope,
    color: '#64748B',
    abbr: 'PCP',
    label: 'Primary Care',
  },
  Pathology: {
    icon: Microscope,
    color: '#A855F7',
    abbr: 'PATH',
    label: 'Pathology',
  },
  Immunology: {
    icon: Shield,
    color: '#22C55E',
    abbr: 'IMM',
    label: 'Immunology',
  },
  Dermatology: {
    icon: Syringe,
    color: '#F97316',
    abbr: 'DERM',
    label: 'Dermatology',
  },
  Gastroenterology: {
    icon: Pill,
    color: '#84CC16',
    abbr: 'GI',
    label: 'Gastroenterology',
  },
  Nephrology: {
    icon: Droplets,
    color: '#0EA5E9',
    abbr: 'NEPH',
    label: 'Nephrology',
  },
  Psychiatry: {
    icon: Brain,
    color: '#7C3AED',
    abbr: 'PSYCH',
    label: 'Psychiatry',
  },
};

// Default fallback for unknown specialties
export const DEFAULT_SPECIALTY: SpecialtyConfig = {
  icon: Stethoscope,
  color: '#64748B',
  abbr: '???',
  label: 'Unknown',
};

/**
 * Get specialty configuration with fallback
 */
export function getSpecialtyConfig(specialty: string): SpecialtyConfig {
  return SPECIALTY_ICONS[specialty] || DEFAULT_SPECIALTY;
}

/**
 * Get all specialty abbreviations for legend/filter UI
 */
export function getAllSpecialtyAbbrs(): { abbr: string; label: string; color: string }[] {
  return Object.values(SPECIALTY_ICONS).map(({ abbr, label, color }) => ({
    abbr,
    label,
    color,
  }));
}
