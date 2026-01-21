# Veeva Ecosystem Integration

> CRM, Vault, Approved Email, and Crossix patterns for pharma martech.

---

## Veeva Product Overview

| Product | Category | Purpose |
|---------|----------|---------|
| **Vault CRM** | CRM | HCP/Account management, call reporting, multichannel |
| **Vault PromoMats** | Content | MLR workflow, asset lifecycle, modular content |
| **Approved Email** | Channel | Compliant rep-sent email |
| **Crossix DIFA** | Analytics | Privacy-safe Rx attribution |
| **Network** | Data | HCP master data, NPI enrichment |
| **OpenData** | Data | HCP/HCO reference data |
| **Engage** | Channel | Virtual meetings, digital HCP engagement |
| **Nitro** | Analytics | Reporting and analytics |

### Priority for Integration

| Priority | Products |
|----------|----------|
| **Core** | Vault CRM, Vault PromoMats, Approved Email, Crossix |
| **Nice-to-have** | Network, OpenData, Engage, Nitro |

---

## Vault CRM

### Overview

Vault CRM is a deep application for life sciences that connects sales, marketing, and medical teams on a single platform with a unified customer database.

### Key Objects

| Object | Description |
|--------|-------------|
| **Account** | Organization/practice entity |
| **HCP** | Healthcare professional record |
| **Call** | Field visit/interaction record |
| **Activity** | General engagement activity |
| **Territory** | Geographic/account assignment |

### Core Capabilities

- Pre-call insights and suggested actions
- Call reporting and documentation
- Sample management
- Territory management
- Multichannel coordination

### Integration Patterns

```
TwinEngine → Veeva CRM API → HCP/Call data
                   ↓
           Activity logging
                   ↓
         Engagement history sync
```

### API Considerations

- REST API available
- Bulk data export options
- Webhook capabilities for events
- OAuth authentication

### 2024-2025 Changes

- Moving off Salesforce to Veeva's own infrastructure
- AI features: CRM Bot, Voice Control
- AI Agents announced (Oct 2025)

---

## Vault PromoMats

### Overview

Vault PromoMats is a regulated content management application supporting the full lifecycle of promotional content.

### Asset Lifecycle

```
Draft → Review → Approved → Distributed → Expired/Retired
  │        │         │           │              │
  │        │         │           │              └── Archive, audit
  │        │         │           └── Track usage
  │        │         └── Available for distribution
  │        └── MLR workflow
  └── Content creation
```

### MLR Workflow Features

| Feature | Benefit |
|---------|---------|
| Automated routing | Correct reviewers assigned |
| Parallel review | Faster cycle time |
| Comment tracking | Clear resolution path |
| Digital signatures | Audit compliance |
| Tier-based review | 50-75% faster for reused content |
| Auto-expiration | Prevents outdated content use |

### Modular Content

- Pre-approved content blocks
- Assemble approved modules into new pieces
- Only new/changed content requires full review
- Consistent messaging across channels

### 2025 AI Features

| Feature | Function |
|---------|----------|
| **Quick Check Agent** | Pre-MLR compliance scan |
| **Content Agent** | Context-aware insights |
| **MLR Bot** | Review assistance (roadmap) |
| **Content Similarity** | Detect similar existing content |

### Integration Patterns

```
TwinEngine → Vault API → Asset metadata
                 ↓
          Content delivery
                 ↓
        Usage tracking back to Vault
```

---

## Veeva Approved Email (VAE)

### Overview

Approved Email enables reps to send compliant, personalized emails to HCPs using pre-approved templates and fragments.

### Components

| Component | Description |
|-----------|-------------|
| **Template** | Static HTML backbone, MLR-approved |
| **Fragment** | Reusable content block, insertable |
| **Token** | Dynamic personalization element |

### Template Structure

```html
<html>
  <head><!-- Styles, meta --></head>
  <body>
    <!-- Header (static, branded) -->

    {{insertEmailFragments}}  <!-- Fragment insertion point -->

    <!-- ISI (Important Safety Information) -->

    <!-- Footer (unsubscribe, PI link) -->
  </body>
</html>
```

### Common Tokens

| Token | Purpose |
|-------|---------|
| `{{insertEmailFragments}}` | Fragment insertion point |
| `{{$VaultDocID}}` | Link to Vault document |
| `{{Account.Name}}` | Account personalization |
| `{{User.Name}}` | Rep name |
| `{{unsubscribe_product_link}}` | Unsubscribe URL |

### Compliance Features

- All content pre-approved via PromoMats
- Consent status checked before send
- Unsubscribe automatically included
- Activity logged to CRM
- Audit trail maintained

### Performance Benchmarks

- 40% open rate (vs. ~20% blast email)
- 6× higher CTR than blast email
- Lower unsubscribe rates

### Integration Patterns

```
TwinEngine NBA → Recommend email action
         ↓
   Veeva CRM → Trigger Approved Email
         ↓
   Activity logged → Sync to TwinEngine
```

---

## Veeva Crossix DIFA

### Overview

Crossix DIFA (Data Integration for Advertising) connects media exposure to health outcomes in a privacy-safe manner.

### Data Coverage

- 300M+ patients
- ~70% of US Rx and Mx claims
- Real-time attribution
- Multi-source integration

### Privacy Model

| Aspect | Approach |
|--------|----------|
| **Level** | Micro-cohort (aggregated) |
| **Individual data** | Never exposed |
| **HIPAA** | Exceeds requirements |
| **NAI Code** | Compliant |

### DIFA HCP

Specific offering for HCP campaign measurement:
- Verifies HCP targeting accuracy
- Connects HCP exposure to patient Rx behavior
- ROI by campaign/channel
- Non-biased verification

### Key Metrics

| Metric | Description |
|--------|-------------|
| **Rx Lift** | Post-exposure prescription change vs. control |
| **TRx** | Total prescriptions |
| **NRx** | New prescriptions |
| **NBRx** | New-to-brand prescriptions |
| **Conversion** | Exposed HCPs who prescribe |

### Integration Patterns

```
Campaign data → Crossix DIFA → Attribution results
                     ↓
              TwinEngine analytics
                     ↓
             Performance dashboards
```

### DIFA Data Stream

- Raw analytics data export
- Micro-cohort level (privacy-safe)
- Feed to data warehouse
- Custom analytics/reporting

---

## Veeva Network

### Overview

HCP master data management, NPI enrichment, data quality.

### Key Features

- HCP/HCO profile management
- NPI validation
- Specialty coding
- Affiliation tracking
- Change data capture

### Integration Pattern

```
External HCP data → Veeva Network → Validated, enriched
                          ↓
                    Vault CRM sync
                          ↓
                   TwinEngine HCP profiles
```

---

## API Best Practices

### Authentication

- OAuth 2.0 for API access
- Secure credential storage
- Token refresh handling

### Rate Limiting

- Respect API rate limits
- Implement backoff strategies
- Batch operations where possible

### Data Sync

- Incremental sync preferred
- Handle deletions/deactivations
- Maintain audit logs

### Error Handling

- Graceful degradation
- Retry logic for transient failures
- Alert on persistent errors

---

## Veeva ↔ Generic Terminology

| Veeva Term | Generic Equivalent |
|------------|-------------------|
| Account | Organization/Practice |
| HCP | Healthcare Professional |
| Call | Field Visit/Interaction |
| CLM | Closed Loop Marketing / Detail Aid |
| VAE | Veeva Approved Email |
| Vault | Document/Asset Management |
| PromoMats | Promotional Materials Library |
| Network | HCP Master Data |
| Crossix | Rx Attribution/Analytics |
