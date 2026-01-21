# Campaign Planning Task

## Purpose
Design data-driven engagement campaigns optimized for audience and objectives.

## Input Requirements
- Campaign objective (awareness, conversion, retention, defense)
- Target audience criteria
- Available channels and budget constraints
- Timeline and key milestones

## Planning Framework

### 1. Audience Selection
- Apply targeting criteria to HCP universe
- Exclude blocked/opted-out HCPs
- Segment by engagement potential
- Size validation (minimum viable audience)

### 2. Channel Strategy
- Analyze channel preferences for target audience
- Check saturation levels by channel
- Identify optimal channel mix
- Sequence touchpoints logically

### 3. Message Theme Selection
- Review MSI for candidate themes
- Avoid saturated themes (MSI > 70)
- Match themes to adoption stage
- Plan theme rotation schedule

### 4. Timing Optimization
- Avoid recent contact conflicts
- Respect frequency caps
- Align with external events (conferences, etc.)
- Plan follow-up cadence

### 5. Competitive Considerations
- Identify high-CPI HCPs in audience
- Adjust messaging for defensive situations
- Prioritize at-risk HCPs in sequence

### 6. Success Metrics
- Define primary KPIs
- Set realistic targets based on historical data
- Plan measurement approach

## Output Format

```markdown
## Campaign Plan: [Campaign Name]

### Objective
[Clear statement of campaign goal]

### Target Audience
- **Size**: X HCPs
- **Criteria**: [filter description]
- **Segments**: [breakdown]

### Channel Mix
| Channel | % of Touches | Rationale |
|---------|--------------|-----------|
| Email | XX% | High affinity, low saturation |
| Rep Visit | XX% | Tier 1 priority |

### Message Strategy
| Week | Theme | Channel | Audience Segment |
|------|-------|---------|------------------|
| 1 | [Theme] | Email | All |
| 2 | [Theme] | Rep | Tier 1 |

### Pre-Flight Checks
- [ ] No theme with MSI > 70
- [ ] No HCP contacted in last 7 days
- [ ] High-CPI HCPs flagged for priority
- [ ] MLR approval obtained

### Success Criteria
| Metric | Target | Baseline |
|--------|--------|----------|
| Open Rate | XX% | XX% |
| Response Rate | XX% | XX% |
```

## Guardrails
- Respect channel frequency limits
- Check MSI before committing to themes
- Verify audience size meets minimum thresholds
- Flag any compliance concerns for MLR review
