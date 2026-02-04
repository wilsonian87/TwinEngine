/**
 * PDF Export Service
 *
 * Generates branded PDF reports for:
 * - Simulation results
 * - Audience profiles
 * - HCP profiles
 * - Cohort comparisons
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export type ExportType = "simulation" | "audience" | "hcp-profile" | "comparison";

export interface ExportOptions {
  /** Document title */
  title: string;
  /** Name of user generating the export */
  generatedBy: string;
  /** Include confidential data markers */
  includeConfidential?: boolean;
  /** Custom subtitle */
  subtitle?: string;
}

export interface SimulationExportData {
  id: string;
  scenarioName: string;
  runAt: string;
  predictedRxLift: number;
  predictedEngagementRate: number;
  predictedResponseRate: number;
  predictedReach: number;
  vsBaseline: {
    rxLiftDelta: number;
    engagementDelta: number;
    responseDelta: number;
  };
  stimuliConfig?: {
    channel: string;
    frequency: string;
    message: string;
    budget: number;
  };
  audienceName?: string;
  audienceSize?: number;
}

export interface AudienceExportData {
  id: string;
  name: string;
  description?: string;
  hcpCount: number;
  createdAt: string;
  filters?: Record<string, unknown>;
  source: string;
  topSpecialties?: Array<{ specialty: string; count: number }>;
  tierDistribution?: Array<{ tier: string; count: number }>;
  avgEngagement?: number;
  avgRxVolume?: number;
}

export interface HCPProfileExportData {
  id: string;
  npi: string;
  firstName: string;
  lastName: string;
  specialty: string;
  tier: string;
  state: string;
  city: string;
  engagementScore: number;
  rxVolume: number;
  marketShare: number;
  channelPreferences?: Record<string, number>;
  recentEngagements?: Array<{
    channel: string;
    date: string;
    response: string;
  }>;
  segment?: string;
}

export interface ComparisonExportData {
  audienceA: {
    id: string;
    name: string;
    hcpCount: number;
    avgEngagement: number;
    avgRxVolume: number;
  };
  audienceB: {
    id: string;
    name: string;
    hcpCount: number;
    avgEngagement: number;
    avgRxVolume: number;
  };
  comparison: {
    engagementDelta: number;
    rxVolumeDelta: number;
    overlap: number;
    uniqueToA: number;
    uniqueToB: number;
  };
}

type ExportData =
  | SimulationExportData
  | AudienceExportData
  | HCPProfileExportData
  | ComparisonExportData;

// ============================================================================
// BRAND STYLES
// ============================================================================

const BRAND_COLORS = {
  primary: "#6b21a8", // consumption-purple
  accent: "#d97706", // catalyst-gold
  text: "#18181b", // foreground
  muted: "#71717a", // muted-foreground
  border: "#e4e4e7", // border
  background: "#ffffff",
  success: "#22c55e",
  warning: "#f59e0b",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BRAND_COLORS.text,
    backgroundColor: BRAND_COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLORS.primary,
  },
  headerLeft: {
    flexDirection: "column",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    color: BRAND_COLORS.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: BRAND_COLORS.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    color: BRAND_COLORS.muted,
    marginTop: 4,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  timestamp: {
    fontSize: 9,
    color: BRAND_COLORS.muted,
  },
  confidential: {
    fontSize: 8,
    color: BRAND_COLORS.warning,
    fontWeight: "bold",
    marginTop: 4,
    padding: 4,
    backgroundColor: "#fef3c7",
    borderRadius: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: BRAND_COLORS.primary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "23%",
    padding: 12,
    backgroundColor: "#fafafa",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BRAND_COLORS.border,
  },
  metricLabel: {
    fontSize: 8,
    textTransform: "uppercase",
    color: BRAND_COLORS.muted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: BRAND_COLORS.accent,
  },
  metricDelta: {
    fontSize: 9,
    marginTop: 2,
  },
  metricDeltaPositive: {
    color: BRAND_COLORS.success,
  },
  metricDeltaNegative: {
    color: "#ef4444",
  },
  table: {
    width: "100%",
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: BRAND_COLORS.muted,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.border,
  },
  tableCell: {
    fontSize: 10,
    color: BRAND_COLORS.text,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: BRAND_COLORS.text,
    marginBottom: 8,
  },
  badge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.primary,
    color: "#ffffff",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.border,
  },
  footerText: {
    fontSize: 8,
    color: BRAND_COLORS.muted,
  },
  footerPage: {
    fontSize: 8,
    color: BRAND_COLORS.muted,
  },
});

// ============================================================================
// DOCUMENT COMPONENTS
// ============================================================================

interface HeaderProps {
  title: string;
  subtitle?: string;
  generatedBy: string;
  includeConfidential?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  generatedBy,
  includeConfidential,
}) =>
  React.createElement(
    View,
    { style: styles.header },
    React.createElement(
      View,
      { style: styles.headerLeft },
      React.createElement(Text, { style: styles.logo }, "OmniVor"),
      React.createElement(Text, { style: styles.title }, title),
      subtitle && React.createElement(Text, { style: styles.subtitle }, subtitle)
    ),
    React.createElement(
      View,
      { style: styles.headerRight },
      React.createElement(
        Text,
        { style: styles.timestamp },
        `Generated: ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`
      ),
      React.createElement(Text, { style: styles.timestamp }, `By: ${generatedBy}`),
      includeConfidential &&
        React.createElement(Text, { style: styles.confidential }, "CONFIDENTIAL")
    )
  );

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, suffix = "" }) =>
  React.createElement(
    View,
    { style: styles.metricCard },
    React.createElement(Text, { style: styles.metricLabel }, label),
    React.createElement(
      Text,
      { style: styles.metricValue },
      typeof value === "number" ? value.toLocaleString() : value,
      suffix
    ),
    delta !== undefined &&
      React.createElement(
        Text,
        {
          style: [
            styles.metricDelta,
            delta >= 0 ? styles.metricDeltaPositive : styles.metricDeltaNegative,
          ],
        },
        delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`
      )
  );

const Footer: React.FC = () =>
  React.createElement(
    View,
    { style: styles.footer, fixed: true },
    React.createElement(
      Text,
      { style: styles.footerText },
      `OmniVor - HCP Digital Twin Platform | ${format(new Date(), "yyyy")}`
    ),
    React.createElement(
      Text,
      { style: styles.footerPage, render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` }
    )
  );

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

function createSimulationDocument(
  data: SimulationExportData,
  options: ExportOptions
): React.ReactElement {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, {
        title: options.title || "Simulation Results",
        subtitle: data.scenarioName,
        generatedBy: options.generatedBy,
        includeConfidential: options.includeConfidential,
      }),
      // Key Metrics Section
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Performance Metrics"),
        React.createElement(
          View,
          { style: styles.metricsGrid },
          React.createElement(MetricCard, {
            label: "Rx Lift",
            value: `+${data.predictedRxLift.toFixed(1)}`,
            suffix: "%",
            delta: data.vsBaseline?.rxLiftDelta,
          }),
          React.createElement(MetricCard, {
            label: "Engagement",
            value: data.predictedEngagementRate.toFixed(1),
            suffix: "%",
            delta: data.vsBaseline?.engagementDelta,
          }),
          React.createElement(MetricCard, {
            label: "Response Rate",
            value: data.predictedResponseRate.toFixed(1),
            suffix: "%",
            delta: data.vsBaseline?.responseDelta,
          }),
          React.createElement(MetricCard, {
            label: "Reach",
            value: data.predictedReach,
          })
        )
      ),
      // Stimuli Configuration
      data.stimuliConfig &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Campaign Configuration"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableRow },
              React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Channel"),
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: "70%" }] },
                data.stimuliConfig.channel
              )
            ),
            React.createElement(
              View,
              { style: styles.tableRow },
              React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Frequency"),
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: "70%" }] },
                data.stimuliConfig.frequency
              )
            ),
            React.createElement(
              View,
              { style: styles.tableRow },
              React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Message"),
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: "70%" }] },
                data.stimuliConfig.message
              )
            ),
            React.createElement(
              View,
              { style: styles.tableRow },
              React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Budget"),
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: "70%" }] },
                `$${data.stimuliConfig.budget.toLocaleString()}`
              )
            )
          )
        ),
      // Audience Info
      data.audienceName &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Target Audience"),
          React.createElement(Text, { style: styles.paragraph }, data.audienceName),
          data.audienceSize &&
            React.createElement(
              Text,
              { style: styles.paragraph },
              `${data.audienceSize.toLocaleString()} HCPs`
            )
        ),
      React.createElement(Footer)
    )
  );
}

function createAudienceDocument(
  data: AudienceExportData,
  options: ExportOptions
): React.ReactElement {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, {
        title: options.title || "Audience Profile",
        subtitle: data.name,
        generatedBy: options.generatedBy,
        includeConfidential: options.includeConfidential,
      }),
      // Overview
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Overview"),
        React.createElement(
          View,
          { style: styles.metricsGrid },
          React.createElement(MetricCard, {
            label: "Total HCPs",
            value: data.hcpCount,
          }),
          data.avgEngagement !== undefined &&
            React.createElement(MetricCard, {
              label: "Avg Engagement",
              value: data.avgEngagement.toFixed(1),
              suffix: "%",
            }),
          data.avgRxVolume !== undefined &&
            React.createElement(MetricCard, {
              label: "Avg Rx Volume",
              value: data.avgRxVolume.toFixed(0),
            })
        )
      ),
      // Description
      data.description &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Description"),
          React.createElement(Text, { style: styles.paragraph }, data.description)
        ),
      // Top Specialties
      data.topSpecialties &&
        data.topSpecialties.length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Top Specialties"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableHeader },
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "60%" }] },
                "Specialty"
              ),
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "40%" }] },
                "Count"
              )
            ),
            ...data.topSpecialties.map((spec, i) =>
              React.createElement(
                View,
                { style: styles.tableRow, key: i },
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "60%" }] },
                  spec.specialty
                ),
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "40%" }] },
                  spec.count.toString()
                )
              )
            )
          )
        ),
      // Tier Distribution
      data.tierDistribution &&
        data.tierDistribution.length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Tier Distribution"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableHeader },
              React.createElement(Text, { style: [styles.tableHeaderCell, { width: "60%" }] }, "Tier"),
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "40%" }] },
                "Count"
              )
            ),
            ...data.tierDistribution.map((tier, i) =>
              React.createElement(
                View,
                { style: styles.tableRow, key: i },
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "60%" }] },
                  tier.tier
                ),
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "40%" }] },
                  tier.count.toString()
                )
              )
            )
          )
        ),
      React.createElement(Footer)
    )
  );
}

function createHCPProfileDocument(
  data: HCPProfileExportData,
  options: ExportOptions
): React.ReactElement {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, {
        title: options.title || "HCP Profile",
        subtitle: `Dr. ${data.firstName} ${data.lastName}`,
        generatedBy: options.generatedBy,
        includeConfidential: options.includeConfidential,
      }),
      // Basic Info
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Profile Information"),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "NPI"),
            React.createElement(Text, { style: [styles.tableCell, { width: "70%" }] }, data.npi)
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Specialty"),
            React.createElement(Text, { style: [styles.tableCell, { width: "70%" }] }, data.specialty)
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Tier"),
            React.createElement(Text, { style: [styles.tableCell, { width: "70%" }] }, data.tier)
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Location"),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "70%" }] },
              `${data.city}, ${data.state}`
            )
          ),
          data.segment &&
            React.createElement(
              View,
              { style: styles.tableRow },
              React.createElement(Text, { style: [styles.tableCell, { width: "30%" }] }, "Segment"),
              React.createElement(Text, { style: [styles.tableCell, { width: "70%" }] }, data.segment)
            )
        )
      ),
      // Key Metrics
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Performance Metrics"),
        React.createElement(
          View,
          { style: styles.metricsGrid },
          React.createElement(MetricCard, {
            label: "Engagement Score",
            value: data.engagementScore.toFixed(1),
            suffix: "%",
          }),
          React.createElement(MetricCard, {
            label: "Rx Volume",
            value: data.rxVolume,
            suffix: "/mo",
          }),
          React.createElement(MetricCard, {
            label: "Market Share",
            value: data.marketShare.toFixed(1),
            suffix: "%",
          })
        )
      ),
      // Channel Preferences
      data.channelPreferences &&
        Object.keys(data.channelPreferences).length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Channel Preferences"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableHeader },
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "60%" }] },
                "Channel"
              ),
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "40%" }] },
                "Preference"
              )
            ),
            ...Object.entries(data.channelPreferences).map(([channel, pref], i) =>
              React.createElement(
                View,
                { style: styles.tableRow, key: i },
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "60%" }] },
                  channel.replace(/_/g, " ")
                ),
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "40%" }] },
                  `${(pref as number).toFixed(0)}%`
                )
              )
            )
          )
        ),
      // Recent Engagements
      data.recentEngagements &&
        data.recentEngagements.length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Recent Engagements"),
          React.createElement(
            View,
            { style: styles.table },
            React.createElement(
              View,
              { style: styles.tableHeader },
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "30%" }] },
                "Channel"
              ),
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "30%" }] },
                "Date"
              ),
              React.createElement(
                Text,
                { style: [styles.tableHeaderCell, { width: "40%" }] },
                "Response"
              )
            ),
            ...data.recentEngagements.slice(0, 10).map((eng, i) =>
              React.createElement(
                View,
                { style: styles.tableRow, key: i },
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "30%" }] },
                  eng.channel.replace(/_/g, " ")
                ),
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "30%" }] },
                  format(new Date(eng.date), "MMM d, yyyy")
                ),
                React.createElement(
                  Text,
                  { style: [styles.tableCell, { width: "40%" }] },
                  eng.response
                )
              )
            )
          )
        ),
      React.createElement(Footer)
    )
  );
}

function createComparisonDocument(
  data: ComparisonExportData,
  options: ExportOptions
): React.ReactElement {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Header, {
        title: options.title || "Audience Comparison",
        subtitle: `${data.audienceA.name} vs ${data.audienceB.name}`,
        generatedBy: options.generatedBy,
        includeConfidential: options.includeConfidential,
      }),
      // Comparison Table
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Side-by-Side Comparison"),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(Text, { style: [styles.tableHeaderCell, { width: "34%" }] }, "Metric"),
            React.createElement(
              Text,
              { style: [styles.tableHeaderCell, { width: "33%" }] },
              data.audienceA.name
            ),
            React.createElement(
              Text,
              { style: [styles.tableHeaderCell, { width: "33%" }] },
              data.audienceB.name
            )
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableCell, { width: "34%" }] }, "HCP Count"),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "33%" }] },
              data.audienceA.hcpCount.toLocaleString()
            ),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "33%" }] },
              data.audienceB.hcpCount.toLocaleString()
            )
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "34%" }] },
              "Avg Engagement"
            ),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "33%" }] },
              `${data.audienceA.avgEngagement.toFixed(1)}%`
            ),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "33%" }] },
              `${data.audienceB.avgEngagement.toFixed(1)}%`
            )
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableCell, { width: "34%" }] }, "Avg Rx Volume"),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "33%" }] },
              data.audienceA.avgRxVolume.toFixed(0)
            ),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "33%" }] },
              data.audienceB.avgRxVolume.toFixed(0)
            )
          )
        )
      ),
      // Delta Metrics
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Variance Analysis"),
        React.createElement(
          View,
          { style: styles.metricsGrid },
          React.createElement(MetricCard, {
            label: "Engagement Delta",
            value: data.comparison.engagementDelta.toFixed(1),
            suffix: "%",
            delta: data.comparison.engagementDelta,
          }),
          React.createElement(MetricCard, {
            label: "Rx Volume Delta",
            value: data.comparison.rxVolumeDelta.toFixed(1),
            suffix: "%",
            delta: data.comparison.rxVolumeDelta,
          }),
          React.createElement(MetricCard, {
            label: "Overlap",
            value: data.comparison.overlap,
            suffix: " HCPs",
          })
        )
      ),
      // Unique HCPs
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Unique HCPs"),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "60%" }] },
              `Unique to ${data.audienceA.name}`
            ),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "40%" }] },
              data.comparison.uniqueToA.toLocaleString()
            )
          ),
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "60%" }] },
              `Unique to ${data.audienceB.name}`
            ),
            React.createElement(
              Text,
              { style: [styles.tableCell, { width: "40%" }] },
              data.comparison.uniqueToB.toLocaleString()
            )
          )
        )
      ),
      React.createElement(Footer)
    )
  );
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate a PDF buffer for the specified export type and data
 */
export async function generatePDF(
  type: ExportType,
  data: ExportData,
  options: ExportOptions
): Promise<Buffer> {
  let document: React.ReactElement;

  switch (type) {
    case "simulation":
      document = createSimulationDocument(data as SimulationExportData, options);
      break;
    case "audience":
      document = createAudienceDocument(data as AudienceExportData, options);
      break;
    case "hcp-profile":
      document = createHCPProfileDocument(data as HCPProfileExportData, options);
      break;
    case "comparison":
      document = createComparisonDocument(data as ComparisonExportData, options);
      break;
    default:
      throw new Error(`Unsupported export type: ${type}`);
  }

  const buffer = await renderToBuffer(document);
  return Buffer.from(buffer);
}

/**
 * Get suggested filename for export
 */
export function getExportFilename(type: ExportType, title: string): string {
  const sanitized = title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const timestamp = format(new Date(), "yyyy-MM-dd");
  return `omnivor_${type}_${sanitized}_${timestamp}.pdf`;
}
