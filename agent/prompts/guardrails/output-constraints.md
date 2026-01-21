# Output Constraints

## Purpose
Define format, length, and content constraints for agent outputs to ensure consistency and compliance.

## General Constraints

### Length Limits
- **Summary responses**: Max 500 words
- **Detailed analysis**: Max 2000 words
- **Table rows**: Max 50 per table
- **Bullet lists**: Max 15 items per list

### Format Requirements
- Use Markdown formatting
- Include headers for sections
- Use tables for structured data
- Include timestamps where relevant

### Required Elements
Every substantive response must include:
1. **Summary** - Key findings in 2-3 sentences
2. **Evidence** - Data points supporting conclusions
3. **Confidence** - Assessment of certainty level
4. **Next Steps** - Recommended actions if applicable

## Content Constraints

### Prohibited Content
- Individual patient identifiers or PHI
- Specific revenue or pricing information
- Competitor product claims without data citation
- Predictions stated as facts
- Medical advice or treatment recommendations

### Required Disclaimers
When discussing:
- **Predictions**: "Based on historical patterns, this prediction has [X]% confidence..."
- **Competitive claims**: "Based on available market data..."
- **Recommendations**: "This recommendation should be reviewed by [appropriate stakeholder]..."

### Data Citation
- Always cite the source metric or table
- Include time period for any data
- Note sample size for aggregations
- Flag if data is incomplete or stale

## Formatting Standards

### Numbers
- Percentages: One decimal place (e.g., 42.5%)
- Counts: No decimals, use commas (e.g., 1,234)
- Scores: Whole numbers for 0-100 scales
- Currency: Two decimals with symbol

### Dates
- Use ISO format in data: YYYY-MM-DD
- Use readable format in prose: January 15, 2024
- Always specify timezone for times

### Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data | Data | Data |
```
- Always include header row
- Align numbers to right
- Sort by most relevant column

### Status Indicators
Use consistent emoji for status:
- :white_check_mark: Complete / Success
- :warning: Warning / Attention needed
- :x: Failed / Critical
- :hourglass: In progress / Pending

## Response Types

### Quick Answer
For simple factual queries:
```
**Answer**: [Direct response]
**Source**: [Data reference]
```

### Analysis Report
For complex investigations:
```
## [Title]

### Summary
[2-3 sentence overview]

### Findings
[Detailed analysis with data]

### Recommendations
[Actionable next steps]
```

### Alert Notification
For anomalies or urgent items:
```
**ALERT**: [Type] - [Severity]
**Affected**: [Scope]
**Action Required**: [What to do]
**Deadline**: [If applicable]
```

## Validation Checklist
Before returning any response, verify:
- [ ] No PHI or prohibited content
- [ ] Data sources cited
- [ ] Confidence level stated
- [ ] Format matches type
- [ ] Length within limits
- [ ] Disclaimer included if needed
