# TwinEngine Reasoning Patterns

This document defines canonical reasoning patterns for AI agents operating within TwinEngine. Each pattern includes structured prompts, expected inputs, and output formats.

---

## Pattern 1: Diagnosis

**Purpose:** Explain why an HCP's engagement is changing

### Trigger Phrases
- "Why is [HCP] disengaged?"
- "What's causing the engagement decline?"
- "Explain the drop in [metric]"
- "Diagnose the issue with [HCP/cohort]"

### Reasoning Steps

```
1. IDENTIFY the symptom
   - What metric is concerning? (engagement score, response rate, etc.)
   - What is the magnitude of change?
   - Over what time period?

2. GATHER context
   - Recent touch history (channels, frequency, themes)
   - Competitive signals (CPI trend)
   - Saturation levels (MSI by theme)
   - Adoption stage and segment

3. HYPOTHESIZE causes
   - Competitive capture: High/rising CPI
   - Message fatigue: High MSI on primary themes
   - Channel mismatch: Low response on used channels
   - Contact overload: Exceeding optimal frequency
   - External factors: Practice changes, events

4. VALIDATE hypotheses
   - Cross-reference with data
   - Check for correlated patterns
   - Consider timing alignment

5. CONCLUDE with root cause(s)
   - Primary driver
   - Contributing factors
   - Confidence level
```

### Output Template

```markdown
## Diagnosis: [HCP Name] Engagement Decline

**Symptom:** Engagement score dropped from [X] to [Y] over [period]

**Root Cause:** [Primary cause]
- Evidence: [Supporting data]
- Confidence: [High/Medium/Low]

**Contributing Factors:**
1. [Factor 1] - [Evidence]
2. [Factor 2] - [Evidence]

**Recommended Action:** [What to do]
```

---

## Pattern 2: Comparison

**Purpose:** Identify meaningful differences between cohorts or segments

### Trigger Phrases
- "Compare [Cohort A] vs [Cohort B]"
- "How do [segment] HCPs differ?"
- "What distinguishes high performers?"
- "Show differences between [X] and [Y]"

### Reasoning Steps

```
1. DEFINE the comparison groups
   - Cohort A criteria
   - Cohort B criteria
   - Ensure comparable scope

2. IDENTIFY comparison dimensions
   - Engagement metrics
   - Channel preferences
   - Competitive exposure
   - Saturation levels
   - Response patterns

3. CALCULATE differences
   - Absolute differences
   - Relative differences (%)
   - Statistical significance (if sample sizes allow)

4. FILTER for significance
   - Focus on meaningful differences (>10% delta)
   - Highlight actionable insights
   - Note confounding factors

5. SYNTHESIZE findings
   - Key differentiators
   - Implications for strategy
   - Recommended actions
```

### Output Template

```markdown
## Comparison: [Cohort A] vs [Cohort B]

**Overview:**
| Metric | [Cohort A] | [Cohort B] | Difference |
|--------|------------|------------|------------|
| Count | [n1] | [n2] | - |
| Avg Engagement | [x] | [y] | [delta] |
| Avg CPI | [x] | [y] | [delta] |
| Avg MSI | [x] | [y] | [delta] |

**Key Differences:**
1. [Most significant difference] - [Implication]
2. [Second difference] - [Implication]

**Similarities:**
- [Shared characteristic]

**Strategic Implications:**
[What this means for engagement strategy]
```

---

## Pattern 3: Recommendation

**Purpose:** Suggest the optimal next action for an HCP or cohort

### Trigger Phrases
- "What should we do next for [HCP]?"
- "Recommend actions for [cohort]"
- "What's the best channel for [HCP]?"
- "How do we defend against [competitor]?"

### Reasoning Steps

```
1. ASSESS current state
   - Engagement level and trend
   - Adoption stage
   - Recent interactions
   - Channel preferences

2. EVALUATE pressures
   - Competitive threat (CPI)
   - Message saturation (MSI)
   - Contact capacity remaining
   - Budget constraints

3. APPLY decision rules
   - If CPI > 70 AND engagement declining → DEFEND
   - If MSI > 80 on primary theme → PAUSE or shift theme
   - If engagement < 30 AND no recent contact → REACTIVATE
   - If engagement > 70 AND CPI < 30 → NURTURE or EXPAND
   - Default: ENGAGE or REINFORCE based on trajectory

4. SELECT optimal channel
   - Historical response rates
   - Current channel capacity
   - Recency of last touch by channel
   - Preference alignment

5. RECOMMEND with rationale
   - Action type
   - Specific channel
   - Suggested theme (if applicable)
   - Timing considerations
   - Confidence level
```

### Output Template

```markdown
## Recommendation: [HCP Name]

**Action:** [Action Type] via [Channel]

**Rationale:**
- [Key driver 1]
- [Key driver 2]

**Confidence:** [High/Medium/Low] ([X]%)

**Expected Impact:**
- Engagement: [projected change]
- Timeline: [expected response window]

**Constraints Considered:**
- Contact limit: [X/Y remaining]
- MSI status: [theme saturation level]
- Competitive pressure: [CPI level]

**Alternative Options:**
1. [Alternative 1] - [Why not chosen]
2. [Alternative 2] - [Why not chosen]
```

---

## Pattern 4: Simulation

**Purpose:** Project outcomes of proposed changes or interventions

### Trigger Phrases
- "What if we [action]?"
- "Simulate [intervention] for [HCP/cohort]"
- "Project the impact of [change]"
- "How would [scenario] affect engagement?"

### Reasoning Steps

```
1. DEFINE the scenario
   - What intervention/change?
   - Who is affected?
   - What timeframe?

2. ESTABLISH baseline
   - Current metrics
   - Historical trends
   - Comparable past scenarios

3. MODEL the impact
   - Direct effects (engagement change)
   - Secondary effects (saturation, competitive response)
   - Confidence intervals

4. ASSESS risks
   - Downside scenarios
   - Saturation risk
   - Competitive reaction
   - Resource requirements

5. PROJECT outcomes
   - Best case
   - Expected case
   - Worst case
   - Confidence level
```

### Output Template

```markdown
## Simulation: [Scenario Description]

**Scenario:**
- Intervention: [What change]
- Target: [Who affected]
- Timeframe: [Duration]

**Baseline:**
| Metric | Current | 30-day Trend |
|--------|---------|--------------|
| Engagement | [X] | [trend] |
| Response Rate | [Y] | [trend] |

**Projected Outcomes:**
| Scenario | Engagement | Probability |
|----------|------------|-------------|
| Best Case | +[X]% | [P]% |
| Expected | +[Y]% | [P]% |
| Worst Case | [Z]% | [P]% |

**Risk Factors:**
1. [Risk 1] - Mitigation: [strategy]
2. [Risk 2] - Mitigation: [strategy]

**Recommendation:** [Proceed / Modify / Reconsider]
```

---

## Pattern 5: Anomaly Investigation

**Purpose:** Investigate unusual patterns or metric changes

### Trigger Phrases
- "Why did [metric] spike/drop?"
- "Investigate the anomaly in [area]"
- "What's unusual about [cohort]?"
- "Explain the sudden change in [metric]"

### Reasoning Steps

```
1. CHARACTERIZE the anomaly
   - What changed?
   - Magnitude of deviation
   - When did it start?
   - How long has it persisted?

2. SCOPE the impact
   - How many HCPs affected?
   - Which segments/territories?
   - Which channels/themes?

3. INVESTIGATE causes
   - Internal factors (campaigns, content changes)
   - External factors (competitive actions, market events)
   - Data quality issues
   - Seasonal patterns

4. CORRELATE with events
   - Timeline alignment
   - Campaign launches
   - Competitive activity
   - System changes

5. RECOMMEND response
   - If root cause identified: specific action
   - If uncertain: monitoring plan
   - If data issue: escalate for review
```

### Output Template

```markdown
## Anomaly Investigation: [Description]

**Anomaly Detected:**
- Metric: [What changed]
- Deviation: [X] standard deviations from norm
- First observed: [Date]
- Affected scope: [N] HCPs in [segment/territory]

**Investigation Findings:**
| Hypothesis | Evidence | Confidence |
|------------|----------|------------|
| [Cause 1] | [Data] | [H/M/L] |
| [Cause 2] | [Data] | [H/M/L] |

**Most Likely Cause:** [Conclusion]

**Recommended Response:**
- Immediate: [Action]
- Short-term: [Action]
- Monitoring: [What to watch]
```

---

## Usage Guidelines

### Combining Patterns
Patterns can be combined for complex queries:
- "Why is engagement declining AND what should we do?" → Diagnosis + Recommendation
- "Compare cohorts AND simulate impact of intervention" → Comparison + Simulation

### Confidence Calibration
- **High confidence:** Multiple data points align, clear pattern, historical precedent
- **Medium confidence:** Some uncertainty, mixed signals, limited data
- **Low confidence:** Insufficient data, conflicting signals, novel situation

### Escalation Triggers
Escalate to human review when:
- Confidence is low on high-impact decisions
- Anomaly investigation yields no clear cause
- Recommendation conflicts with stated constraints
- Action would affect >100 HCPs

---

*TwinEngine Reasoning Patterns v1.0*
*Phase 12D.1: Ontology Translation*
