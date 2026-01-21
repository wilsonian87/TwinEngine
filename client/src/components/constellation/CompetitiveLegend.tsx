/**
 * CompetitiveLegend - Visual encoding legend for Competitive Orbit View
 *
 * Phase 12A: Explains the competitive pressure visualization encoding
 * to help users understand what the rings and colors represent.
 */

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Info, Target, TrendingUp, Users, Download, Image, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportCanvasToPng, exportCompetitiveData, generateTimestampFilename } from '@/lib/constellation/export';
import type { CompetitiveOrbitData } from '@shared/schema';

interface CompetitiveLegendProps {
  data: CompetitiveOrbitData | null;
  visible: boolean;
  onToggleVisibility: () => void;
  selectedCompetitor: string | null;
  onCompetitorSelect: (id: string | null) => void;
}

export function CompetitiveLegend({
  data,
  visible,
  onToggleVisibility,
  selectedCompetitor,
  onCompetitorSelect,
}: CompetitiveLegendProps) {
  const [expanded, setExpanded] = useState(false);

  if (!visible || !data) return null;

  return (
    <div className="absolute top-20 right-4 z-30 w-64">
      {/* Main Legend Card */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-lg overflow-hidden">
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-900">Competitive Orbit</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>

        {/* Expanded Legend Content */}
        {expanded && (
          <div className="p-4 space-y-4">
            {/* Visual Encoding */}
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Visual Encoding
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-300 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-700">Ring Distance</div>
                    <div className="text-slate-500">Closer = higher competitive pressure</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-1 bg-slate-400 rounded mt-1.5" />
                  <div>
                    <div className="font-medium text-slate-700">Ring Thickness</div>
                    <div className="text-slate-500">Thicker = larger market share</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-700">Ring Color</div>
                    <div className="text-slate-500">Competitor identity</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CPI Scale */}
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                CPI Scale (0-100)
              </h4>
              <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-500" />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Low (0-25)</span>
                <span>Medium (26-50)</span>
                <span>High (51-75)</span>
                <span>Critical (76+)</span>
              </div>
            </div>

            {/* Info tooltip */}
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs">
              <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="text-blue-700">
                Click a ring to filter HCPs affected by that competitor. Press Esc to clear selection.
              </span>
            </div>

            {/* Export Actions */}
            <ExportActions />
          </div>
        )}

        {/* Competitor List */}
        <div className="border-t border-slate-100">
          <div className="px-4 py-2 bg-slate-50">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Competitors ({data.competitors.length})
            </h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {data.competitors
              .sort((a, b) => b.avgCpi - a.avgCpi)
              .map((competitor) => (
                <button
                  key={competitor.id}
                  className={cn(
                    "w-full px-4 py-2 flex items-center gap-3 text-left transition-colors",
                    "hover:bg-slate-50 border-l-4",
                    selectedCompetitor === competitor.id
                      ? "bg-slate-100 border-l-indigo-500"
                      : "border-l-transparent"
                  )}
                  style={{
                    borderLeftColor: selectedCompetitor === competitor.id ? undefined : competitor.color,
                  }}
                  onClick={() => onCompetitorSelect(
                    selectedCompetitor === competitor.id ? null : competitor.id
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: competitor.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {competitor.name}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>CPI: {competitor.avgCpi.toFixed(0)}</span>
                      <span className="text-slate-300">|</span>
                      <span>{competitor.affectedHcpCount} HCPs</span>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-medium",
                    competitor.avgCpi <= 25 && "bg-green-100 text-green-700",
                    competitor.avgCpi > 25 && competitor.avgCpi <= 50 && "bg-yellow-100 text-yellow-700",
                    competitor.avgCpi > 50 && competitor.avgCpi <= 75 && "bg-orange-100 text-orange-700",
                    competitor.avgCpi > 75 && "bg-red-100 text-red-700"
                  )}>
                    {competitor.marketShare.toFixed(0)}%
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggleVisibility}
        className={cn(
          "mt-2 w-full px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
          "bg-white/95 backdrop-blur-sm border-slate-200 shadow-sm",
          "hover:bg-slate-50 text-slate-700"
        )}
      >
        Hide Competitive Overlay
      </button>
    </div>
  );
}

/**
 * Export Actions - PNG and CSV export buttons
 */
function ExportActions() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handlePngExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);

    try {
      const filename = generateTimestampFilename('competitive-orbit');
      await exportCanvasToPng(filename);
    } catch (error) {
      console.error('PNG export failed:', error);
      setExportError('Failed to export PNG. Please try again.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleCsvExport = useCallback(async (type: 'signals' | 'portfolio-alerts') => {
    setExporting(true);
    setExportError(null);

    try {
      await exportCompetitiveData(type);
    } catch (error) {
      console.error('CSV export failed:', error);
      setExportError('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div>
      <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
        Export
      </h4>
      <div className="flex gap-2">
        <button
          onClick={handlePngExport}
          disabled={exporting}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors",
            "border border-slate-200 bg-white hover:bg-slate-50",
            exporting && "opacity-50 cursor-not-allowed"
          )}
          title="Export visualization as PNG"
        >
          <Image className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>
        <button
          onClick={() => handleCsvExport('signals')}
          disabled={exporting}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors",
            "border border-slate-200 bg-white hover:bg-slate-50",
            exporting && "opacity-50 cursor-not-allowed"
          )}
          title="Export competitive signals as CSV"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
        <button
          onClick={() => handleCsvExport('portfolio-alerts')}
          disabled={exporting}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors",
            "border border-slate-200 bg-white hover:bg-slate-50",
            exporting && "opacity-50 cursor-not-allowed"
          )}
          title="Export portfolio alerts as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Alerts</span>
        </button>
      </div>
      {exportError && (
        <p className="mt-1 text-xs text-red-600">{exportError}</p>
      )}
    </div>
  );
}

/**
 * Toggle button to show competitive overlay when hidden
 */
interface CompetitiveToggleButtonProps {
  visible: boolean;
  onToggle: () => void;
  hasData: boolean;
}

export function CompetitiveToggleButton({
  visible,
  onToggle,
  hasData,
}: CompetitiveToggleButtonProps) {
  if (visible) return null;

  return (
    <button
      onClick={onToggle}
      disabled={!hasData}
      className={cn(
        "absolute top-20 right-4 z-30",
        "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
        "bg-white/95 backdrop-blur-sm border-slate-200 shadow-sm",
        hasData
          ? "hover:bg-indigo-50 hover:border-indigo-200 text-slate-700"
          : "opacity-50 cursor-not-allowed text-slate-400"
      )}
    >
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" />
        <span>Show Competitive Orbit</span>
      </div>
    </button>
  );
}
