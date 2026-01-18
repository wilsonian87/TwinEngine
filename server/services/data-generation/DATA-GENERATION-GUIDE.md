# Data Generation Quick Reference

## Quick Commands

```bash
# Current state (2000 HCPs)
npm run generate:data -- --seed=42 --hcps=2000 --months=12 --wipe

# Scale to 2500 HCPs (+500)
npm run generate:data -- --seed=42 --hcps=2500 --months=12 --wipe

# Scale to 3000 HCPs (+1000)
npm run generate:data -- --seed=42 --hcps=3000 --months=12 --wipe

# Validate data integrity only (no changes)
npm run generate:data -- --validate-only
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--seed=N` | Random seed for reproducibility | 42 |
| `--hcps=N` | Target number of HCP profiles | 2000 |
| `--months=N` | Historical data window (months back) | 12 |
| `--wipe` | Delete all existing data before generating | false |
| `--validate-only` | Run integrity checks without generating | false |

## Scaling Guide

### Expected Data Volumes

| HCPs | Stimuli | Outcomes | Rx History | Territories | Campaigns |
|------|---------|----------|------------|-------------|-----------|
| 2000 | ~80,000 | ~16,000 | ~24,000 | ~2,500 | ~50 |
| 2500 | ~100,000 | ~20,000 | ~30,000 | ~3,125 | ~55 |
| 3000 | ~120,000 | ~24,000 | ~36,000 | ~3,750 | ~60 |
| 5000 | ~200,000 | ~40,000 | ~60,000 | ~6,250 | ~80 |

### Approximate Ratios

- **Stimuli**: ~40x HCPs
- **Outcomes**: ~8x HCPs (20% response rate on stimuli)
- **Rx History**: ~12x HCPs (1 record per HCP per month)
- **Territories**: ~1.25x HCPs
- **Campaigns**: ~50 base + ~10 per 1000 HCPs

## Current Approach

### Wipe-and-Regenerate Pattern

The generator uses a **wipe-and-regenerate** strategy, not incremental updates.

> **Mental Model**: Don't think "add 500 HCPs." Think "regenerate at scale 2500."
>
> The seed ensures you get consistent, reproducible data. Changing the HCP count just changes the sample size from the same statistical distribution.

### Why This Pattern?

For **synthetic test data**, wipe-and-regenerate is the right choice:

| Concern | Why It's Fine |
|---------|---------------|
| "I'll lose my data" | It's synthetic - regenerate it identically with the same seed |
| "Incremental would be faster" | Only at very large scales; optimize the generator instead |
| "I want to preserve edits" | Put manual overrides in `seed-data/` files, not DB mutations |
| "Adding 500 ≠ regenerating 2500" | Statistically equivalent - same distributions, same seed logic |

### Why NOT Incremental?

Incremental generation would require solving:
- ID conflicts between old and new records
- Retroactive campaign participation for new HCPs
- Maintaining referential integrity across 7 interconnected tables
- Broken seed reproducibility ("seed 42 + 2500" ≠ "seed 42 + 2000, then +500")

This isn't tech debt - it's a different architecture that trades reproducibility for persistence. For test data, reproducibility wins.

### How It Works

1. If `--wipe` is specified, all existing data is deleted
2. Fresh data is generated for the specified HCP count
3. Post-generation validation runs automatically

```bash
# Scale from 2000 to 2500? Regenerate at the new scale:
npm run generate:data -- --seed=42 --hcps=2500 --months=12 --wipe
```

### Generation Steps

1. **HCP Profiles** - Personas with specialty, tier, segment
2. **Territory Assignments** - Rep-to-HCP mappings by region
3. **Campaigns** - Marketing campaigns with targeting rules
4. **Stimuli Events** - Channel interactions (emails, visits, etc.)
5. **Outcome Events** - Responses to stimuli
6. **Prescribing History** - Rx volume correlated to engagement
7. **Aggregations** - Recalculate engagement scores and metrics

## Seed Strategy

### Reproducibility

Using the same seed + same parameters produces **identical data**:

```bash
# These generate the exact same dataset:
npm run generate:data -- --seed=42 --hcps=2000 --wipe
npm run generate:data -- --seed=42 --hcps=2000 --wipe

# This generates a SUPERSET with the same first 2000 HCPs:
npm run generate:data -- --seed=42 --hcps=2500 --wipe
```

The RNG is deterministic - HCP #1 through #2000 will be identical whether you generate 2000 or 2500 total.

### Changing Seeds

Different seeds produce different (but statistically similar) distributions:

```bash
# Different HCP names, locations, events - same statistical profile:
npm run generate:data -- --seed=123 --hcps=2000 --wipe
```

### Preserving Custom Data

If you need specific test fixtures (e.g., a known HCP for integration tests):

1. Add them to `seed-data/` files (not direct DB inserts)
2. The generator loads seed data before generating random data
3. Your fixtures survive regeneration

## Validation

### Automated Checks

Post-generation validation verifies:
- Referential integrity (all FKs resolve)
- Record count targets met
- Data distribution within expected ranges
- No orphaned records

### Manual Verification

```bash
# Check current data state
npm run generate:data -- --validate-only
```

Validation output shows pass/fail for each check with detailed counts.

## Troubleshooting

### "Data already exists" Message

The generator skips if HCP count meets the target. Use `--wipe` to force regeneration:

```bash
npm run generate:data -- --seed=42 --hcps=2000 --wipe
```

### "Can I just add 500 HCPs?"

No - and that's intentional. See [Why NOT Incremental?](#why-not-incremental) above.

The right approach:
```bash
# Regenerate at the new total scale
npm run generate:data -- --seed=42 --hcps=2500 --months=12 --wipe
```

With the same seed, HCPs #1-2000 will be statistically identical to your previous run.

### Validation Failures

If validation fails after generation:
1. Check the specific failed check in output
2. Review logs for batch insert errors
3. Re-run with `--wipe` to start fresh

### Performance Notes

- **Batch size**: 500 records per insert
- **Large datasets** (5000+ HCPs): May take several minutes
- Generation progress is logged per table

If performance becomes a bottleneck at scale, optimize the generator (parallel inserts, bulk operations) rather than adding incremental complexity.
