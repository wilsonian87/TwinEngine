# Data Sources & Standards

> NPI registry, specialty codes, Rx data sources, and data standards for pharma HCP data.

---

## NPI (National Provider Identifier)

### Overview

The NPI is a unique 10-digit identification number issued to healthcare providers in the United States by CMS.

### Key Characteristics

| Attribute | Detail |
|-----------|--------|
| **Length** | 10 digits |
| **Format** | Numeric only, no embedded information |
| **Permanence** | Assigned once, never changes |
| **Uniqueness** | One NPI per provider |
| **Mandate** | HIPAA Administrative Simplification Standard |

### NPI Types

| Type | Description | Example |
|------|-------------|---------|
| **Type 1** | Individual provider (physician, NP, etc.) | Dr. Smith |
| **Type 2** | Organization (hospital, group practice) | ABC Medical Group |

### NPPES Registry

The National Plan and Provider Enumeration System (NPPES) is the official NPI registry.

- **URL:** https://npiregistry.cms.hhs.gov/
- **Data updates:** Weekly
- **Access:** Free, public
- **API:** Available via CMS

### NPI Lookup Uses

- Verify HCP identity
- Link to other data sources
- Compliance/audit requirements
- Deduplication

### API Access

```
GET https://npiregistry.cms.hhs.gov/api/?version=2.1&number={npi}
```

Returns: Provider name, address, taxonomy, enumeration date, etc.

---

## Taxonomy Codes

### Overview

Healthcare Provider Taxonomy Codes are 10-character codes that designate provider classification and specialization.

### Source

National Uniform Claim Committee (NUCC) maintains the official code set.

### Structure

```
XXXXXXXXXX
│││││││││└── Specialization (if applicable)
│││││└────── Area of specialization
│└────────── Classification
└─────────── Provider type
```

### Example Codes

| Code | Description |
|------|-------------|
| 207Q00000X | Family Medicine |
| 207QA0000X | Family Medicine - Adolescent Medicine |
| 207RH0000X | Internal Medicine - Hematology |
| 207VX0000X | Obstetrics & Gynecology |
| 208D00000X | General Practice |
| 2084N0400X | Psychiatry - Neurology |

### Updates

- Published twice yearly (January and July)
- CMS crosswalk available: Medicare provider → Taxonomy

---

## Specialty Mapping

### TwinEngine Specialties

| Specialty | Abbreviation | Taxonomy Examples |
|-----------|--------------|-------------------|
| Oncology | ONC | 207RX0202X, 261QM2500X |
| Cardiology | CARD | 207RC0000X |
| Neurology | NEU | 2084N0400X |
| Pulmonology | PULM | 207RP1001X |
| Rheumatology | RHEUM | 207RR0500X |
| Endocrinology | ENDO | 207RE0101X |
| Pediatrics | PEDS | 208000000X |
| Ophthalmology | OPH | 207W00000X |
| ENT | ENT | 207Y00000X |
| Primary Care | PCP | 207Q00000X, 208D00000X |
| Pathology | PATH | 207ZP0101X |
| Immunology | IMM | 207RI0200X |
| Dermatology | DERM | 207N00000X |
| Gastroenterology | GI | 207RG0100X |
| Nephrology | NEPH | 207RN0300X |
| Psychiatry | PSYCH | 2084P0800X |

### Mapping Challenges

- Multiple taxonomy codes per specialty
- Subspecialties vs. primary specialty
- Self-reported vs. claims-derived
- Updates over time

---

## Rx Data Sources

### IQVIA (formerly IMS Health)

| Product | Description |
|---------|-------------|
| **Xponent** | Prescription-level data by prescriber |
| **DDD** | Diagnosis-linked Rx data |
| **Plantrak** | Wholesaler data |

### Symphony Health

| Product | Description |
|---------|-------------|
| **IDV** | Integrated Dataverse - comprehensive Rx data |
| **Claims** | Medical and pharmacy claims |

### Veeva Crossix

| Product | Description |
|---------|-------------|
| **DIFA** | Privacy-safe attribution |
| **Data Platform** | 300M+ patient lives, 70% Rx coverage |

### Data Access Models

| Model | Description |
|-------|-------------|
| **Licensed** | Direct data purchase, stored locally |
| **SaaS** | Accessed via vendor platform |
| **Attribution** | Anonymized, aggregated results only |

### Key Rx Metrics

| Metric | Definition |
|--------|------------|
| **TRx** | Total prescriptions (new + refills) |
| **NRx** | New prescriptions only |
| **NBRx** | New-to-brand prescriptions |
| **Market Share** | Brand TRx / Category TRx |
| **SOV** | Share of voice |

---

## HCP Data Vendors

### Veeva OpenData

- Comprehensive HCP/HCO database
- Real-time lookup via OpenData Live
- Integrated with Veeva CRM
- NPI, DEA, state license validation

### IQVIA OneKey

- Global HCP/HCO reference
- Affiliation tracking
- Specialty and sub-specialty
- Activity status

### Data.com (Salesforce)

- General business data
- Less pharma-specific
- Often supplemented with specialized sources

---

## Data Quality Considerations

### Common Issues

| Issue | Mitigation |
|-------|------------|
| Duplicate records | NPI-based deduplication |
| Stale data | Regular refresh cycles |
| Incomplete specialty | Multiple source triangulation |
| Address changes | Quarterly validation |
| Deceased/retired | Death master file, license checks |

### Data Hygiene Process

```
Raw Data → Validation → Standardization → Enrichment → Deduplication → Master Record
    │           │              │               │              │              │
    │           │              │               │              │              └── Golden record
    │           │              │               │              └── NPI matching
    │           │              │               └── Add missing fields
    │           │              └── Format normalization
    │           └── Check against registry
    └── Ingest from source
```

---

## Compliance Data

### Sunshine Act (Open Payments)

- **Source:** CMS Open Payments database
- **Content:** Payments to physicians, teaching hospitals
- **Update:** Annual publication
- **Use:** Due diligence, speaker qualification

### DEA Registration

- Drug Enforcement Administration registration
- Required for controlled substance prescribing
- Public lookup available

### State License

- State medical board records
- License status, disciplinary actions
- Not centralized (state-by-state)

### Exclusion Lists

| List | Source |
|------|--------|
| OIG LEIE | Office of Inspector General exclusions |
| SAM | System for Award Management |
| State Medicaid | State-specific exclusions |

---

## Integration Best Practices

### Data Model Design

```
HCP Master
├── NPI (primary key)
├── Demographics (name, credentials)
├── Specialty (taxonomy codes)
├── Affiliations (organizations)
├── Contact (address, phone, email)
├── Compliance (license, exclusions)
└── Engagement (linked to activity)
```

### Sync Strategies

| Strategy | Use Case |
|----------|----------|
| **Full refresh** | Initial load, periodic rebuild |
| **Incremental** | Daily/weekly updates |
| **Real-time** | Critical validation |
| **Event-driven** | Triggered by activity |

### Privacy Considerations

- HCP contact data is not PHI
- Patient data requires protection
- Follow vendor agreements
- Audit data access
