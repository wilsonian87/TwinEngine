# Anomaly Investigation Task

## Purpose
Investigate unexpected patterns, outliers, or concerning trends in platform data.

## Input Requirements
- Anomaly description or alert trigger
- Affected entities (HCPs, campaigns, channels)
- Time period of interest
- Baseline for comparison

## Investigation Framework

### 1. Anomaly Characterization
- What metric is anomalous?
- Magnitude of deviation from baseline
- When did anomaly begin?
- Is it isolated or widespread?

### 2. Scope Assessment
- How many HCPs/entities affected?
- Which segments are impacted?
- Geographic or specialty patterns?
- Channel-specific or cross-channel?

### 3. Temporal Analysis
- Did something change at anomaly onset?
- Campaign launches or pauses
- Competitive activity changes
- Seasonal or cyclical factors

### 4. Correlation Check
- Related metrics moving together
- Upstream causes (e.g., data quality)
- Downstream effects
- External factors (market events)

### 5. Root Cause Hypotheses
- Data quality issue
- Campaign impact
- Competitive action
- System/technical issue
- Genuine behavioral shift

### 6. Recommended Actions
- Immediate mitigations
- Further investigation needed
- Stakeholders to notify
- Monitoring to establish

## Output Format

```markdown
## Anomaly Investigation: [Brief Description]

### Summary
- **Detected**: [Date/Time]
- **Severity**: Low | Medium | High | Critical
- **Status**: Investigating | Root Cause Identified | Resolved

### Anomaly Description
[What was observed, with specific metrics]

### Affected Scope
- **HCPs**: X affected
- **Segments**: [list]
- **Channels**: [list]
- **Time Period**: [range]

### Investigation Findings

#### Timeline
| Date | Event | Relevance |
|------|-------|-----------|
| [Date] | [Event] | [Connection to anomaly] |

#### Correlations
- [Metric A] moved [direction] at same time
- [Metric B] shows [pattern]

### Root Cause Assessment
**Most Likely**: [Hypothesis]
**Confidence**: Low | Medium | High
**Evidence**: [Supporting data points]

### Recommended Actions
1. **Immediate**: [Action]
2. **Short-term**: [Action]
3. **Monitoring**: [What to watch]

### Open Questions
- [Question requiring further investigation]
```

## Guardrails
- Do not jump to conclusions without data
- Flag low-confidence assessments clearly
- Escalate critical anomalies immediately
- Document investigation steps for audit trail
