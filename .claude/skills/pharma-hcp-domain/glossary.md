# Pharma HCP Domain Glossary

> Industry terminology, Veeva terms, abbreviations, and translations for developers.

---

## Industry Terms

### General

| Term | Definition |
|------|------------|
| **HCP** | Healthcare Professional (physician, NP, PA, etc.) |
| **HCO** | Healthcare Organization (hospital, practice, etc.) |
| **KOL** | Key Opinion Leader - influential physician, academic |
| **DOL** | Digital Opinion Leader - social media influence |
| **TA** | Therapeutic Area (oncology, cardiology, etc.) |
| **SOC** | Standard of Care - current treatment approach |
| **LOE** | Loss of Exclusivity - patent expiration |
| **Formulary** | List of covered drugs by payer |
| **PA** | Prior Authorization - payer approval requirement |

### Prescribing

| Term | Definition |
|------|------------|
| **Rx** | Prescription |
| **TRx** | Total prescriptions (new + refills) |
| **NRx** | New prescriptions only |
| **NBRx** | New-to-brand prescriptions |
| **Decile** | Prescribing volume tier (1-10) |
| **Writer** | Prescribing physician |
| **Non-writer** | HCP who doesn't prescribe (yet) |
| **Switcher** | HCP who changed from competitor |
| **Trialer** | HCP trying product for first time |

### Marketing & Sales

| Term | Definition |
|------|------------|
| **SOV** | Share of Voice - brand presence vs. competitors |
| **Reach** | % of target HCPs contacted |
| **Frequency** | Avg contacts per HCP |
| **Call Plan** | Rep territory and visit schedule |
| **Detail** | Rep presentation to HCP |
| **Leave-behind** | Physical material left after call |
| **CLM** | Closed Loop Marketing (interactive detail aid) |
| **eDetail** | Electronic/remote detailing |

### Content & Compliance

| Term | Definition |
|------|------------|
| **MLR** | Medical, Legal, Regulatory review |
| **ISI** | Important Safety Information |
| **PI** | Prescribing Information (full label) |
| **USPI** | US Prescribing Information |
| **Black Box** | Boxed warning for serious risks |
| **Fair Balance** | Equal presentation of benefits and risks |
| **Off-label** | Use not approved in labeling |
| **Indication** | Approved use for the drug |

### Regulatory

| Term | Definition |
|------|------------|
| **FDA** | Food and Drug Administration (US) |
| **EMA** | European Medicines Agency |
| **HIPAA** | Health Insurance Portability and Accountability Act |
| **PDMA** | Prescription Drug Marketing Act |
| **TCPA** | Telephone Consumer Protection Act |
| **Sunshine Act** | Open Payments reporting requirement |
| **PhRMA Code** | Industry self-regulatory guidelines |

### Pharmacovigilance

| Term | Definition |
|------|------------|
| **AE** | Adverse Event |
| **ADR** | Adverse Drug Reaction |
| **SAE** | Serious Adverse Event |
| **SUSAR** | Suspected Unexpected Serious Adverse Reaction |
| **PV** | Pharmacovigilance |
| **MedWatch** | FDA safety reporting system |
| **ICSR** | Individual Case Safety Report |
| **PSUR** | Periodic Safety Update Report |

---

## Veeva Terminology

| Veeva Term | Generic Equivalent |
|------------|-------------------|
| **Account** | Organization/Practice |
| **Call** | Field Visit/Interaction |
| **CLM** | Closed Loop Marketing / Detail Aid |
| **VAE** | Veeva Approved Email |
| **Vault** | Document/Asset Management |
| **PromoMats** | Promotional Materials Library |
| **Network** | HCP Master Data |
| **OpenData** | HCP/HCO Reference Data |
| **Crossix** | Rx Attribution/Analytics |
| **DIFA** | Data Integration for Advertising |
| **Engage** | Virtual Meeting Platform |
| **Nitro** | Analytics/Reporting Platform |

---

## Channel Abbreviations

| Abbreviation | Channel |
|--------------|---------|
| **VAE** | Veeva Approved Email |
| **F2F** | Face-to-face (rep visit) |
| **MSL** | Medical Science Liaison |
| **FRM** | Field Reimbursement Manager |
| **P2P** | Peer-to-peer program |
| **CME** | Continuing Medical Education |

---

## Metric Abbreviations

| Abbreviation | Metric |
|--------------|--------|
| **OR** | Open Rate |
| **CTR** | Click-Through Rate |
| **ToS** | Time on Site |
| **CPA** | Cost Per Action |
| **CPV** | Cost Per Visit |
| **ROI** | Return on Investment |

---

## Data Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| **NPI** | National Provider Identifier |
| **DEA** | Drug Enforcement Administration (number) |
| **NUCC** | National Uniform Claim Committee |
| **NPPES** | National Plan and Provider Enumeration System |
| **CMS** | Centers for Medicare & Medicaid Services |
| **PHI** | Protected Health Information |
| **PII** | Personally Identifiable Information |

---

## Specialty Abbreviations

| Abbreviation | Specialty |
|--------------|-----------|
| **ONC** | Oncology |
| **CARD** | Cardiology |
| **NEU** | Neurology |
| **PULM** | Pulmonology |
| **RHEUM** | Rheumatology |
| **ENDO** | Endocrinology |
| **PEDS** | Pediatrics |
| **OPH** | Ophthalmology |
| **ENT** | Ear, Nose, Throat |
| **PCP** | Primary Care Provider |
| **PATH** | Pathology |
| **IMM** | Immunology |
| **DERM** | Dermatology |
| **GI** | Gastroenterology |
| **NEPH** | Nephrology |
| **PSYCH** | Psychiatry |

---

## Marketing ↔ Developer Translation

| Marketing Says | Developer Needs |
|----------------|-----------------|
| "Decile 1-3 targets" | `rxVolume >= percentile(70)` filter |
| "Call plan coverage" | `totalTouches / plannedTouches` |
| "MLR approved" | `status === 'Approved' && !expired` |
| "Opt-out compliant" | Check `consentStatus`, suppression rules |
| "KOL tier" | `hcpTier === 'advocate'` OR `influenceScore >= 80` |
| "DOL" | Social media influence metrics |
| "Digital fatigue" | `fatigueIndex >= 0.7` OR `openRate < 0.1` |
| "Dark pathway" | `healthStatus === 'dark'` |
| "Reactivation candidate" | `lastTouchDays >= 60 && historicalEngagement >= 'medium'` |
| "Speaker-eligible" | Compliance check + no cooling-off period |
| "Sample drop" | `touchType === 'sample'` |
| "FRM coverage" | Payer/Market Access field resource assignment |
| "ISI placement" | Important Safety Information positioning |
| "Fair balance" | Risk-benefit presentation compliance |
| "Day 0" | FDA approval date, launch start |
| "Pre-commercial" | Before approval - disease education only |
| "Below the line" | Non-personal promotion (digital, print) |
| "Above the line" | Personal promotion (field, speaker programs) |

---

## TwinEngine-Specific Terms

| Term | Definition |
|------|------------|
| **Constellation** | 3D visualization of HCP/channel data |
| **L1** | Level 1 - Solar system view (ecosystem) |
| **L2** | Level 2 - Campaign orbit view |
| **L3** | Level 3 - HCP constellation view |
| **Nerve Center** | Dashboard (OmniVor terminology) |
| **Signal Index** | Catalog of signal sources |
| **Cohort Lab** | Audience builder |
| **Scenario Lab** | Simulation workspace |
| **Signal Diagnostic** | Channel health analysis |
| **Catalyst Queue** | NBA/action queue |
| **Health Status** | Channel engagement classification |

---

## Common Acronyms Quick Reference

| Acronym | Expansion |
|---------|-----------|
| AE | Adverse Event |
| CLM | Closed Loop Marketing |
| CRM | Customer Relationship Management |
| CTR | Click-Through Rate |
| DEA | Drug Enforcement Administration |
| DIFA | Data Integration for Advertising |
| DOL | Digital Opinion Leader |
| EMA | European Medicines Agency |
| FDA | Food and Drug Administration |
| FRM | Field Reimbursement Manager |
| HCO | Healthcare Organization |
| HCP | Healthcare Professional |
| HIPAA | Health Insurance Portability and Accountability Act |
| ISI | Important Safety Information |
| KOL | Key Opinion Leader |
| LOE | Loss of Exclusivity |
| MLR | Medical, Legal, Regulatory |
| MOA | Mechanism of Action |
| MSL | Medical Science Liaison |
| NBA | Next Best Action |
| NPI | National Provider Identifier |
| NRx | New Prescriptions |
| OR | Open Rate |
| P2P | Peer-to-Peer |
| PA | Prior Authorization |
| PDMA | Prescription Drug Marketing Act |
| PHI | Protected Health Information |
| PI | Prescribing Information |
| PV | Pharmacovigilance |
| Rx | Prescription |
| SAE | Serious Adverse Event |
| SOC | Standard of Care |
| SOV | Share of Voice |
| TA | Therapeutic Area |
| TCPA | Telephone Consumer Protection Act |
| TRx | Total Prescriptions |
| VAE | Veeva Approved Email |
