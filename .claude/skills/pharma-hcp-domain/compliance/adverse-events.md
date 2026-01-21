# Adverse Event Handling

> AE reporting requirements, escalation protocols, and pharmacovigilance essentials.

---

## What is an Adverse Event?

An **Adverse Event (AE)** is any undesirable experience associated with the use of a medical product in a patient.

### FDA Definition

An AE is reportable when there are four basic criteria:
1. **Identifiable patient** — Can distinguish the individual
2. **Identifiable reporter** — Source of the information known
3. **Specific drug** — Suspected product identified
4. **Symptom or effect** — Adverse outcome described

---

## AE Classification

### By Severity

| Classification | Definition | Examples |
|----------------|------------|----------|
| **Serious** | Fatal, life-threatening, hospitalization, disability, congenital anomaly, requires intervention | Death, stroke, birth defect |
| **Non-serious** | Other adverse experiences | Nausea, headache, rash |

### By Expectedness

| Classification | Definition |
|----------------|------------|
| **Expected** | Listed in product labeling |
| **Unexpected** | Not listed in current labeling |

### Priority Matrix

| | Expected | Unexpected |
|---|----------|------------|
| **Serious** | Report within 15 days | Report within 15 days (expedited) |
| **Non-serious** | Periodic reporting | Report within 15 days |

---

## Reporting Requirements

### Manufacturer Obligations

Drug manufacturers are **legally required** to:
- Promptly review all AE information from any source
- Report serious AEs to FDA within 15 calendar days
- Submit periodic safety reports
- Maintain records for FDA inspection

### Sources of AE Information

- Clinical trials
- Post-marketing surveillance
- Spontaneous reports (HCPs, patients)
- Scientific literature
- Social media monitoring
- Field force reports
- Call center inquiries

### HCP Reporting

- HCP reporting to FDA is **voluntary** (via MedWatch)
- Manufacturer reporting is **mandatory**
- Only ~10% of AEs are estimated to be reported

---

## MedWatch System

### Overview

MedWatch is the FDA's safety information and adverse event reporting program, established in 1993.

### Reporting Channels

- **Online:** FDA MedWatch website
- **Form:** FDA Form 3500 (voluntary) or 3500A (mandatory)
- **Phone:** 1-800-FDA-1088

### What to Report

- Serious AEs (especially if suspected drug-related)
- Product quality problems
- Medication errors
- Therapeutic failures

---

## Field Force AE Handling

### Rep Encounter Protocol

When a rep hears about a potential AE:

1. **Listen and document** — Capture all details
2. **Do not interpret** — Don't assess causality
3. **Do not advise** — Refer to HCP for medical guidance
4. **Report immediately** — Within 24 hours to pharmacovigilance
5. **Document the report** — Record in CRM system

### Required Information to Capture

| Field | Description |
|-------|-------------|
| Patient identifier | Initials, age, gender (no full name) |
| Reporter | HCP name, contact info |
| Product | Drug name, dose, lot if known |
| Event | Description of adverse experience |
| Dates | Start date, duration, outcome |
| Concomitant meds | Other medications |
| Medical history | Relevant conditions |

### What NOT to Do

- Do not provide medical advice
- Do not assess whether event is drug-related
- Do not minimize or dismiss the report
- Do not promise specific follow-up actions
- Do not share with other HCPs

---

## Digital Channel Considerations

### Email/Web AE Monitoring

- Monitor incoming communications for AE signals
- Train customer service on AE recognition
- Establish clear escalation paths
- Document monitoring procedures

### Social Media

- Active monitoring for product mentions
- AE detection algorithms
- Clear process for verified reports
- Distinguish public vs. private communications

---

## Safety Signal Detection

### Definition

A **safety signal** is an AE pattern that exceeds what would be expected based on clinical trial data.

### Signal Sources

- Increased frequency of known AE
- New/unexpected AE pattern
- Severity increase
- New at-risk population identified

### Response to Signal

1. Investigate causality
2. Assess population impact
3. Determine if action required
4. Communicate to HCPs if needed
5. Update labeling if warranted

---

## Pharmacovigilance Organization

### Typical Structure

```
Chief Medical Officer
        │
Pharmacovigilance Head
        │
    ┌───┴───┐
    │       │
Case Processing    Signal Detection
    │                   │
Intake Team        Analytics Team
```

### Key Functions

| Function | Responsibility |
|----------|---------------|
| **Intake** | Receive and triage AE reports |
| **Processing** | Document, code, assess cases |
| **Signal Detection** | Identify safety patterns |
| **Reporting** | Submit to regulatory authorities |
| **Communication** | HCP/patient safety communications |

---

## Compliance and Enforcement

### FDA Authority

If a manufacturer fails to establish and maintain AE records and reports:
- FDA may withdraw product approval
- Prohibit continued marketing
- Criminal and civil penalties possible

### Inspection Readiness

- Maintain complete AE documentation
- Records must be accessible for FDA inspection
- Audit trails required
- Training documentation for personnel

---

## Integration with TwinEngine

### Considerations

- AE handling is outside TwinEngine scope
- Platform should NOT store PHI/AE data
- Alerts should reference to pharmacovigilance systems
- Field reports go through separate AE workflow

### Agent Guardrails

If building agents that interact with HCP communications:
- Include AE detection logic
- Route potential AEs to pharmacovigilance
- Do not store AE details in marketing systems
- Log handoff for audit purposes

---

## Key AE Terms

| Term | Definition |
|------|------------|
| **AE** | Adverse Event |
| **ADR** | Adverse Drug Reaction (causal relationship established) |
| **SAE** | Serious Adverse Event |
| **SUSAR** | Suspected Unexpected Serious Adverse Reaction |
| **ICSR** | Individual Case Safety Report |
| **PSUR** | Periodic Safety Update Report |
| **PV** | Pharmacovigilance |
| **MedDRA** | Medical Dictionary for Regulatory Activities (coding) |
