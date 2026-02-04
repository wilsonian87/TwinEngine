/**
 * Domain Knowledge Mappings
 *
 * Master configuration for pharmaceutical/HCP domain mappings.
 * Provides hierarchies, synonyms, and relationship scoring.
 */

import type {
  Audience,
  Specialty,
  TherapeuticArea,
  Channel,
  ContentType,
  HCPSubAudience,
} from "./types";

// ============================================================================
// AUDIENCE MAPPINGS
// ============================================================================

export interface AudienceMapping {
  canonical: Audience;
  synonyms: string[];
  subAudiences: HCPSubAudience[] | string[];
  defaultChannels: Channel[];
  characteristics: {
    timeConstrained: boolean;
    preferredContentLength: "short" | "medium" | "long";
    technicalLevel: "low" | "medium" | "high";
  };
}

export const audienceMappings: Record<Audience, AudienceMapping> = {
  HCP: {
    canonical: "HCP",
    synonyms: ["healthcare professional", "provider", "clinician", "doctor", "MD"],
    subAudiences: ["Physician", "Nurse_Practitioner", "Physician_Assistant", "Pharmacist", "Nurse"],
    defaultChannels: ["rep_visit", "email", "conference", "webinar"],
    characteristics: {
      timeConstrained: true,
      preferredContentLength: "short",
      technicalLevel: "high",
    },
  },
  Consumer: {
    canonical: "Consumer",
    synonyms: ["patient", "end user", "customer"],
    subAudiences: [],
    defaultChannels: ["digital_ad", "social_media", "dtc"],
    characteristics: {
      timeConstrained: false,
      preferredContentLength: "medium",
      technicalLevel: "low",
    },
  },
  Payer: {
    canonical: "Payer",
    synonyms: ["insurance", "managed care", "PBM", "health plan"],
    subAudiences: [],
    defaultChannels: ["email", "direct_mail"],
    characteristics: {
      timeConstrained: true,
      preferredContentLength: "long",
      technicalLevel: "high",
    },
  },
  Field: {
    canonical: "Field",
    synonyms: ["sales rep", "MSL", "field force", "account manager"],
    subAudiences: [],
    defaultChannels: ["email", "phone"],
    characteristics: {
      timeConstrained: true,
      preferredContentLength: "short",
      technicalLevel: "medium",
    },
  },
  Caregiver: {
    canonical: "Caregiver",
    synonyms: ["family member", "care partner", "guardian"],
    subAudiences: [],
    defaultChannels: ["digital_ad", "social_media", "email"],
    characteristics: {
      timeConstrained: false,
      preferredContentLength: "medium",
      technicalLevel: "low",
    },
  },
};

// ============================================================================
// SPECIALTY MAPPINGS
// ============================================================================

export interface SpecialtyMapping {
  canonical: Specialty;
  synonyms: string[];
  parent?: Specialty;
  subSpecialties: string[];
  relatedTherapeuticAreas: TherapeuticArea[];
  typicalPatientLoad: "high" | "medium" | "low";
}

export const specialtyMappings: Record<Specialty, SpecialtyMapping> = {
  Internal_Medicine: {
    canonical: "Internal_Medicine",
    synonyms: ["internist", "IM", "general internal medicine"],
    subSpecialties: ["Hospitalist", "General Internal Medicine"],
    relatedTherapeuticAreas: ["Cardiovascular", "Metabolic", "Infectious_Disease"],
    typicalPatientLoad: "high",
  },
  Cardiology: {
    canonical: "Cardiology",
    synonyms: ["cardiologist", "heart specialist", "CV"],
    parent: "Internal_Medicine",
    subSpecialties: ["Interventional Cardiology", "Electrophysiology", "Heart Failure", "Preventive Cardiology"],
    relatedTherapeuticAreas: ["Cardiovascular"],
    typicalPatientLoad: "medium",
  },
  Oncology: {
    canonical: "Oncology",
    synonyms: ["oncologist", "cancer specialist"],
    parent: "Internal_Medicine",
    subSpecialties: ["Medical Oncology", "Radiation Oncology", "Surgical Oncology", "Hematology-Oncology"],
    relatedTherapeuticAreas: ["Oncology", "Immunology"],
    typicalPatientLoad: "low",
  },
  Primary_Care: {
    canonical: "Primary_Care",
    synonyms: ["PCP", "family medicine", "general practice", "GP", "family doctor"],
    subSpecialties: ["Family Medicine", "General Practice"],
    relatedTherapeuticAreas: ["Cardiovascular", "Metabolic", "Respiratory", "Infectious_Disease"],
    typicalPatientLoad: "high",
  },
  Surgery: {
    canonical: "Surgery",
    synonyms: ["surgeon", "surgical"],
    subSpecialties: ["General Surgery", "Orthopedic Surgery", "Cardiac Surgery", "Neurosurgery"],
    relatedTherapeuticAreas: ["Cardiovascular", "Oncology", "Neurology"],
    typicalPatientLoad: "low",
  },
  Neurology: {
    canonical: "Neurology",
    synonyms: ["neurologist", "neuro"],
    subSpecialties: ["Movement Disorders", "Epilepsy", "MS", "Neuro-oncology"],
    relatedTherapeuticAreas: ["Neurology"],
    typicalPatientLoad: "medium",
  },
  Pediatrics: {
    canonical: "Pediatrics",
    synonyms: ["pediatrician", "peds", "children's doctor"],
    subSpecialties: ["Pediatric Cardiology", "Pediatric Neurology", "Pediatric Oncology"],
    relatedTherapeuticAreas: ["Respiratory", "Infectious_Disease"],
    typicalPatientLoad: "high",
  },
  Emergency_Medicine: {
    canonical: "Emergency_Medicine",
    synonyms: ["ER", "emergency", "ED physician", "emergency room"],
    subSpecialties: ["Pediatric Emergency", "Toxicology"],
    relatedTherapeuticAreas: ["Cardiovascular", "Infectious_Disease"],
    typicalPatientLoad: "high",
  },
  Psychiatry: {
    canonical: "Psychiatry",
    synonyms: ["psychiatrist", "mental health"],
    subSpecialties: ["Child Psychiatry", "Addiction Medicine", "Geriatric Psychiatry"],
    relatedTherapeuticAreas: ["Neurology"],
    typicalPatientLoad: "medium",
  },
  Dermatology: {
    canonical: "Dermatology",
    synonyms: ["dermatologist", "derm", "skin specialist"],
    subSpecialties: ["Cosmetic Dermatology", "Dermatopathology"],
    relatedTherapeuticAreas: ["Dermatology", "Immunology"],
    typicalPatientLoad: "high",
  },
  Advanced_Practice: {
    canonical: "Advanced_Practice",
    synonyms: ["NP", "PA", "nurse practitioner", "physician assistant", "APP"],
    subSpecialties: [],
    relatedTherapeuticAreas: ["Cardiovascular", "Metabolic", "Respiratory"],
    typicalPatientLoad: "high",
  },
  Pharmacy: {
    canonical: "Pharmacy",
    synonyms: ["pharmacist", "PharmD", "clinical pharmacist"],
    subSpecialties: ["Clinical Pharmacy", "Ambulatory Care", "Specialty Pharmacy"],
    relatedTherapeuticAreas: [],
    typicalPatientLoad: "high",
  },
  Rheumatology: {
    canonical: "Rheumatology",
    synonyms: ["rheumatologist", "rheum"],
    parent: "Internal_Medicine",
    subSpecialties: [],
    relatedTherapeuticAreas: ["Immunology"],
    typicalPatientLoad: "medium",
  },
  Pulmonology: {
    canonical: "Pulmonology",
    synonyms: ["pulmonologist", "lung specialist", "respiratory"],
    parent: "Internal_Medicine",
    subSpecialties: ["Critical Care", "Sleep Medicine"],
    relatedTherapeuticAreas: ["Respiratory"],
    typicalPatientLoad: "medium",
  },
  Endocrinology: {
    canonical: "Endocrinology",
    synonyms: ["endocrinologist", "endo", "diabetes specialist"],
    parent: "Internal_Medicine",
    subSpecialties: ["Diabetes", "Thyroid", "Obesity Medicine"],
    relatedTherapeuticAreas: ["Metabolic"],
    typicalPatientLoad: "medium",
  },
  Gastroenterology: {
    canonical: "Gastroenterology",
    synonyms: ["GI", "gastroenterologist", "GI specialist"],
    parent: "Internal_Medicine",
    subSpecialties: ["Hepatology", "IBD", "Motility"],
    relatedTherapeuticAreas: ["Gastroenterology"],
    typicalPatientLoad: "medium",
  },
  Nephrology: {
    canonical: "Nephrology",
    synonyms: ["nephrologist", "kidney specialist"],
    parent: "Internal_Medicine",
    subSpecialties: ["Transplant Nephrology", "Dialysis"],
    relatedTherapeuticAreas: ["Metabolic", "Cardiovascular"],
    typicalPatientLoad: "medium",
  },
};

// ============================================================================
// THERAPEUTIC AREA MAPPINGS
// ============================================================================

export interface TherapeuticAreaMapping {
  canonical: TherapeuticArea;
  synonyms: string[];
  conditions: string[];
  commonTreatments: string[];
  relatedSpecialties: Specialty[];
}

export const therapeuticAreaMappings: Record<TherapeuticArea, TherapeuticAreaMapping> = {
  Cardiovascular: {
    canonical: "Cardiovascular",
    synonyms: ["CV", "heart", "cardiac"],
    conditions: ["Heart Failure", "Hypertension", "Arrhythmia", "CAD", "Stroke"],
    commonTreatments: ["ACE inhibitors", "Beta blockers", "Statins"],
    relatedSpecialties: ["Cardiology", "Internal_Medicine", "Primary_Care"],
  },
  Oncology: {
    canonical: "Oncology",
    synonyms: ["cancer", "tumor", "malignancy"],
    conditions: ["Breast Cancer", "Lung Cancer", "Colorectal Cancer", "Prostate Cancer", "Melanoma"],
    commonTreatments: ["Chemotherapy", "Immunotherapy", "Targeted therapy"],
    relatedSpecialties: ["Oncology", "Surgery"],
  },
  Neurology: {
    canonical: "Neurology",
    synonyms: ["neuro", "brain", "nervous system"],
    conditions: ["Alzheimer's", "Parkinson's", "Multiple Sclerosis", "Epilepsy", "Migraine"],
    commonTreatments: ["Dopamine agonists", "Anti-epileptics", "DMTs"],
    relatedSpecialties: ["Neurology", "Psychiatry"],
  },
  Immunology: {
    canonical: "Immunology",
    synonyms: ["immune", "autoimmune", "inflammation"],
    conditions: ["Rheumatoid Arthritis", "Psoriasis", "Lupus", "Crohn's Disease", "Ulcerative Colitis"],
    commonTreatments: ["Biologics", "DMARDs", "JAK inhibitors"],
    relatedSpecialties: ["Rheumatology", "Dermatology", "Gastroenterology"],
  },
  Metabolic: {
    canonical: "Metabolic",
    synonyms: ["metabolism", "endocrine", "diabetes"],
    conditions: ["Type 2 Diabetes", "Obesity", "Hyperlipidemia", "Thyroid disorders"],
    commonTreatments: ["GLP-1 agonists", "SGLT2 inhibitors", "Insulin"],
    relatedSpecialties: ["Endocrinology", "Primary_Care", "Internal_Medicine"],
  },
  Respiratory: {
    canonical: "Respiratory",
    synonyms: ["pulmonary", "lung", "airway"],
    conditions: ["Asthma", "COPD", "IPF", "Cystic Fibrosis"],
    commonTreatments: ["Inhaled corticosteroids", "Bronchodilators", "Biologics"],
    relatedSpecialties: ["Pulmonology", "Primary_Care", "Pediatrics"],
  },
  Infectious_Disease: {
    canonical: "Infectious_Disease",
    synonyms: ["ID", "infection", "antimicrobial"],
    conditions: ["HIV", "Hepatitis", "COVID-19", "Pneumonia", "UTI"],
    commonTreatments: ["Antivirals", "Antibiotics", "Vaccines"],
    relatedSpecialties: ["Internal_Medicine", "Primary_Care", "Emergency_Medicine"],
  },
  Gastroenterology: {
    canonical: "Gastroenterology",
    synonyms: ["GI", "digestive", "gut"],
    conditions: ["IBD", "GERD", "IBS", "Liver disease", "Celiac disease"],
    commonTreatments: ["PPIs", "Biologics", "Aminosalicylates"],
    relatedSpecialties: ["Gastroenterology", "Primary_Care"],
  },
  Dermatology: {
    canonical: "Dermatology",
    synonyms: ["skin", "derm"],
    conditions: ["Eczema", "Psoriasis", "Acne", "Skin cancer", "Rosacea"],
    commonTreatments: ["Topical steroids", "Biologics", "Retinoids"],
    relatedSpecialties: ["Dermatology"],
  },
  Womens_Health: {
    canonical: "Womens_Health",
    synonyms: ["OB/GYN", "gynecology", "obstetrics", "reproductive health"],
    conditions: ["Endometriosis", "PCOS", "Menopause", "Breast health"],
    commonTreatments: ["Hormone therapy", "Contraceptives"],
    relatedSpecialties: ["Primary_Care", "Endocrinology"],
  },
};

// ============================================================================
// CHANNEL MAPPINGS
// ============================================================================

export interface ChannelMapping {
  canonical: Channel;
  synonyms: string[];
  primaryAudiences: Audience[];
  secondaryAudiences: Audience[];
  characteristics: {
    isDigital: boolean;
    isPersonal: boolean;
    avgEngagementTime: "short" | "medium" | "long";
    costPerTouch: "low" | "medium" | "high";
  };
}

export const channelMappings: Record<Channel, ChannelMapping> = {
  email: {
    canonical: "email",
    synonyms: ["e-mail", "electronic mail"],
    primaryAudiences: ["HCP", "Payer"],
    secondaryAudiences: ["Field", "Consumer"],
    characteristics: {
      isDigital: true,
      isPersonal: false,
      avgEngagementTime: "short",
      costPerTouch: "low",
    },
  },
  rep_visit: {
    canonical: "rep_visit",
    synonyms: ["sales call", "detail", "face-to-face", "F2F", "in-person"],
    primaryAudiences: ["HCP"],
    secondaryAudiences: [],
    characteristics: {
      isDigital: false,
      isPersonal: true,
      avgEngagementTime: "medium",
      costPerTouch: "high",
    },
  },
  webinar: {
    canonical: "webinar",
    synonyms: ["web conference", "virtual meeting", "online seminar"],
    primaryAudiences: ["HCP"],
    secondaryAudiences: ["Payer"],
    characteristics: {
      isDigital: true,
      isPersonal: false,
      avgEngagementTime: "long",
      costPerTouch: "medium",
    },
  },
  conference: {
    canonical: "conference",
    synonyms: ["congress", "medical meeting", "symposium"],
    primaryAudiences: ["HCP"],
    secondaryAudiences: [],
    characteristics: {
      isDigital: false,
      isPersonal: true,
      avgEngagementTime: "long",
      costPerTouch: "high",
    },
  },
  digital_ad: {
    canonical: "digital_ad",
    synonyms: ["display ad", "banner ad", "programmatic"],
    primaryAudiences: ["Consumer", "HCP"],
    secondaryAudiences: ["Caregiver"],
    characteristics: {
      isDigital: true,
      isPersonal: false,
      avgEngagementTime: "short",
      costPerTouch: "low",
    },
  },
  phone: {
    canonical: "phone",
    synonyms: ["telephone", "call", "telesales"],
    primaryAudiences: ["HCP", "Consumer"],
    secondaryAudiences: ["Payer"],
    characteristics: {
      isDigital: false,
      isPersonal: true,
      avgEngagementTime: "medium",
      costPerTouch: "medium",
    },
  },
  direct_mail: {
    canonical: "direct_mail",
    synonyms: ["mail", "postal", "print mail"],
    primaryAudiences: ["HCP", "Payer"],
    secondaryAudiences: ["Consumer"],
    characteristics: {
      isDigital: false,
      isPersonal: false,
      avgEngagementTime: "short",
      costPerTouch: "medium",
    },
  },
  social_media: {
    canonical: "social_media",
    synonyms: ["social", "Facebook", "Instagram", "LinkedIn"],
    primaryAudiences: ["Consumer"],
    secondaryAudiences: ["Caregiver", "HCP"],
    characteristics: {
      isDigital: true,
      isPersonal: false,
      avgEngagementTime: "short",
      costPerTouch: "low",
    },
  },
  dtc: {
    canonical: "dtc",
    synonyms: ["direct-to-consumer", "DTC advertising", "consumer advertising"],
    primaryAudiences: ["Consumer"],
    secondaryAudiences: ["Caregiver"],
    characteristics: {
      isDigital: false,
      isPersonal: false,
      avgEngagementTime: "short",
      costPerTouch: "low",
    },
  },
  telehealth: {
    canonical: "telehealth",
    synonyms: ["telemedicine", "virtual care", "remote care"],
    primaryAudiences: ["Consumer", "HCP"],
    secondaryAudiences: ["Caregiver"],
    characteristics: {
      isDigital: true,
      isPersonal: true,
      avgEngagementTime: "medium",
      costPerTouch: "medium",
    },
  },
};

// ============================================================================
// CONTENT TYPE MAPPINGS
// ============================================================================

export interface ContentTypeMapping {
  canonical: ContentType;
  synonyms: string[];
  relatedTypes: ContentType[];
  typicalAudiences: Audience[];
  complianceLevel: "low" | "medium" | "high";
}

export const contentTypeMappings: Record<ContentType, ContentTypeMapping> = {
  market_research: {
    canonical: "market_research",
    synonyms: ["research", "market analysis", "competitive intelligence"],
    relatedTypes: ["benchmark", "ranking"],
    typicalAudiences: ["Field", "Payer"],
    complianceLevel: "medium",
  },
  benchmark: {
    canonical: "benchmark",
    synonyms: ["benchmarking", "comparison", "industry standard"],
    relatedTypes: ["market_research", "ranking"],
    typicalAudiences: ["Field", "Payer"],
    complianceLevel: "low",
  },
  ranking: {
    canonical: "ranking",
    synonyms: ["top performers", "leader board", "ratings"],
    relatedTypes: ["benchmark", "market_research"],
    typicalAudiences: ["Field"],
    complianceLevel: "low",
  },
  field_promotion: {
    canonical: "field_promotion",
    synonyms: ["sales aid", "detail piece", "leave-behind"],
    relatedTypes: ["market_access", "digital_media"],
    typicalAudiences: ["HCP"],
    complianceLevel: "high",
  },
  market_access: {
    canonical: "market_access",
    synonyms: ["HEOR", "value dossier", "formulary submission"],
    relatedTypes: ["field_promotion", "regulatory"],
    typicalAudiences: ["Payer"],
    complianceLevel: "high",
  },
  digital_media: {
    canonical: "digital_media",
    synonyms: ["digital content", "online content", "web content"],
    relatedTypes: ["advertising", "field_promotion"],
    typicalAudiences: ["HCP", "Consumer"],
    complianceLevel: "high",
  },
  advertising: {
    canonical: "advertising",
    synonyms: ["ad", "promotional material", "marketing"],
    relatedTypes: ["digital_media", "field_promotion"],
    typicalAudiences: ["Consumer", "HCP"],
    complianceLevel: "high",
  },
  regulatory: {
    canonical: "regulatory",
    synonyms: ["compliance", "legal", "submission"],
    relatedTypes: ["market_access", "field_promotion"],
    typicalAudiences: ["Payer"],
    complianceLevel: "high",
  },
};

// ============================================================================
// RESOLVER FUNCTIONS
// ============================================================================

/**
 * Check if a string is a synonym for an audience
 */
export function isAudienceSynonym(term: string): Audience | null {
  const normalized = term.toLowerCase();
  for (const [audience, mapping] of Object.entries(audienceMappings)) {
    if (
      audience.toLowerCase() === normalized ||
      mapping.synonyms.some((s) => s.toLowerCase() === normalized)
    ) {
      return audience as Audience;
    }
  }
  return null;
}

/**
 * Check if a string is a synonym for a specialty
 */
export function isSpecialtySynonym(term: string): Specialty | null {
  const normalized = term.toLowerCase();
  for (const [specialty, mapping] of Object.entries(specialtyMappings)) {
    if (
      specialty.toLowerCase() === normalized ||
      specialty.replace(/_/g, " ").toLowerCase() === normalized ||
      mapping.synonyms.some((s) => s.toLowerCase() === normalized)
    ) {
      return specialty as Specialty;
    }
  }
  return null;
}

/**
 * Check if a string is a synonym for a therapeutic area
 */
export function isTherapeuticAreaSynonym(term: string): TherapeuticArea | null {
  const normalized = term.toLowerCase();
  for (const [ta, mapping] of Object.entries(therapeuticAreaMappings)) {
    if (
      ta.toLowerCase() === normalized ||
      ta.replace(/_/g, " ").toLowerCase() === normalized ||
      mapping.synonyms.some((s) => s.toLowerCase() === normalized)
    ) {
      return ta as TherapeuticArea;
    }
  }
  return null;
}

/**
 * Check if a string is a synonym for a channel
 */
export function isChannelSynonym(term: string): Channel | null {
  const normalized = term.toLowerCase();
  for (const [channel, mapping] of Object.entries(channelMappings)) {
    if (
      channel.toLowerCase() === normalized ||
      channel.replace(/_/g, " ").toLowerCase() === normalized ||
      mapping.synonyms.some((s) => s.toLowerCase() === normalized)
    ) {
      return channel as Channel;
    }
  }
  return null;
}

/**
 * Get related channels for an audience
 */
export function getRelatedChannels(audience: Audience): Channel[] {
  const channels: Channel[] = [];
  for (const [channel, mapping] of Object.entries(channelMappings)) {
    if (
      mapping.primaryAudiences.includes(audience) ||
      mapping.secondaryAudiences.includes(audience)
    ) {
      channels.push(channel as Channel);
    }
  }
  return channels;
}

/**
 * Get related specialties for a therapeutic area
 */
export function getRelatedSpecialties(therapeuticArea: TherapeuticArea): Specialty[] {
  return therapeuticAreaMappings[therapeuticArea]?.relatedSpecialties ?? [];
}

/**
 * Get related therapeutic areas for a specialty
 */
export function getRelatedTherapeuticAreas(specialty: Specialty): TherapeuticArea[] {
  return specialtyMappings[specialty]?.relatedTherapeuticAreas ?? [];
}
