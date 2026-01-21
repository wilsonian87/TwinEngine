# Cohort Analysis Task

## Purpose
Analyze a group of HCPs to identify patterns, segments, and actionable insights.

## Input Requirements
- Cohort definition (filter criteria or HCP list)
- Analysis dimensions (engagement, prescribing, competitive, saturation)
- Time period for comparison

## Analysis Framework

### 1. Cohort Composition
- Total HCP count
- Distribution by specialty, tier, segment
- Geographic distribution

### 2. Engagement Health
- Average engagement score
- Channel preference distribution
- Response rate by channel
- Days since last contact distribution

### 3. Risk Assessment
- Churn risk distribution (low/medium/high)
- HCPs with declining engagement trend
- Blocked or unresponsive HCPs

### 4. Opportunity Identification
- High conversion likelihood HCPs
- Underengaged high-potential HCPs
- Channel expansion opportunities

### 5. Competitive Exposure
- Average CPI across cohort
- Top competitors affecting cohort
- HCPs requiring defensive action

### 6. Message Saturation
- Average MSI across cohort
- Themes approaching saturation
- Recommended messaging pivots

## Output Format

```markdown
## Cohort Analysis: [Cohort Name]

### Summary
- **Size**: X HCPs
- **Avg Engagement**: XX/100
- **Avg Churn Risk**: XX/100
- **Top Segment**: [Segment Name]

### Key Findings
1. [Finding with supporting data]
2. [Finding with supporting data]
3. [Finding with supporting data]

### Recommendations
1. [Action] for [X HCPs] - Expected impact: [outcome]
2. [Action] for [X HCPs] - Expected impact: [outcome]

### Risk Alerts
- [X] HCPs at high churn risk
- [X] HCPs under competitive pressure
- [X] HCPs with saturated messaging
```

## Guardrails
- Do not include individual patient data
- Aggregate to minimum cohort size of 5 for reporting
- Flag if cohort is too small for meaningful analysis
