/**
 * OmniVor Charts Components
 *
 * Brand-aligned data visualization components.
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md Phase 9A
 */

// Animated Number
export {
  AnimatedNumber,
  MetricNumber,
  InlineNumber,
  CurrencyNumber,
  PercentNumber,
} from './animated-number';
export type { AnimatedNumberProps } from './animated-number';

// Branded Bar Chart
export {
  BrandedBarChart,
  CompactBarChart,
  RankingBarChart,
} from './branded-bar-chart';
export type { BrandedBarChartProps, BarChartDataPoint } from './branded-bar-chart';

// Branded Line Chart
export {
  BrandedLineChart,
  SimpleLineChart,
  ComparisonLineChart,
} from './branded-line-chart';
export type { BrandedLineChartProps, LineConfig } from './branded-line-chart';

// Engagement Heatmap
export {
  EngagementHeatmap,
  CompactHeatmap,
  ChannelHeatmap,
} from './engagement-heatmap';
export type { EngagementHeatmapProps, HeatmapDataPoint } from './engagement-heatmap';

// Spark Line
export {
  SparkLine,
  TrendSparkLine,
  MinimalSparkLine,
  CardSparkLine,
  TableSparkLine,
} from './spark-line';
export type { SparkLineProps } from './spark-line';
