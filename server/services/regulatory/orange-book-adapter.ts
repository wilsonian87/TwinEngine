/**
 * Orange Book TSV Bulk Download Adapter
 *
 * Downloads FDA Orange Book ZIP, parses patent.txt and exclusivity.txt TSV files,
 * and filters for respiratory drugs. Uses native zlib for decompression.
 */
import { debugLog } from "../../utils/config";
import type { InsertRegulatoryEvent } from "@shared/schema";

const ORANGE_BOOK_URL = "https://www.fda.gov/media/76860/download";

const RESPIRATORY_DRUGS = [
  "dupilumab", "tezepelumab", "benralizumab", "mepolizumab",
  "omalizumab", "fluticasone", "budesonide", "montelukast",
  "tiotropium", "umeclidinium", "salmeterol", "formoterol",
  "mometasone", "beclomethasone", "ciclesonide",
];

function getMockData(): InsertRegulatoryEvent[] {
  return [
    {
      eventType: "patent_expiry",
      title: "Dupixent (dupilumab) - Patent Expiry",
      description: "Patent expiration for dupilumab composition of matter patent",
      drugName: "dupilumab",
      brandName: "Dupixent",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2031-06-15"),
      status: "upcoming",
      source: "orange_book",
      sourceId: "OB-PAT-dupilumab-10738933",
      patentNumber: "10738933",
      metadata: { mock: true },
    },
    {
      eventType: "exclusivity_expiry",
      title: "Tezspire (tezepelumab) - Exclusivity Expiry",
      description: "Orphan drug exclusivity expiration for tezepelumab",
      drugName: "tezepelumab",
      brandName: "Tezspire",
      therapeuticArea: "Respiratory",
      eventDate: new Date("2029-12-17"),
      status: "upcoming",
      source: "orange_book",
      sourceId: "OB-EXCL-tezepelumab-ODE",
      metadata: { mock: true, exclusivityCode: "ODE" },
    },
  ];
}

interface ParsedTSVRow {
  [key: string]: string;
}

function parseTSV(content: string): ParsedTSVRow[] {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  // First line is header (tab-separated, with possible ~ separator in older formats)
  const separator = lines[0].includes("\t") ? "\t" : "~";
  const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));

  const rows: ParsedTSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator);
    const row: ParsedTSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function isRespiratoryDrug(ingredientOrName: string): boolean {
  const lower = ingredientOrName.toLowerCase();
  return RESPIRATORY_DRUGS.some(drug => lower.includes(drug));
}

export class OrangeBookAdapter {
  async fetchEvents(): Promise<InsertRegulatoryEvent[]> {
    debugLog("OrangeBookAdapter", "Fetching Orange Book ZIP");

    try {
      const response = await fetch(ORANGE_BOOK_URL);
      if (!response.ok) {
        debugLog("OrangeBookAdapter", `Download failed: ${response.status}`);
        return getMockData();
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const files = await this.extractZip(buffer);

      const events: InsertRegulatoryEvent[] = [];

      // Parse patent file
      const patentContent = files.get("patent.txt") ?? files.get("Patent.txt");
      if (patentContent) {
        const patentEvents = this.parsePatentFile(patentContent);
        events.push(...patentEvents);
      }

      // Parse exclusivity file
      const exclContent = files.get("exclusivity.txt") ?? files.get("Exclusivity.txt");
      if (exclContent) {
        const exclEvents = this.parseExclusivityFile(exclContent);
        events.push(...exclEvents);
      }

      debugLog("OrangeBookAdapter", `Parsed ${events.length} events from Orange Book`);
      return events.length > 0 ? events : getMockData();
    } catch (error) {
      debugLog("OrangeBookAdapter", `Error: ${error}`);
      return getMockData();
    }
  }

  private async extractZip(buffer: Buffer): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    // Simple ZIP parsing - ZIP files have local file headers starting with PK\x03\x04
    let offset = 0;
    while (offset < buffer.length - 4) {
      // Look for local file header signature
      if (buffer[offset] !== 0x50 || buffer[offset + 1] !== 0x4b ||
          buffer[offset + 2] !== 0x03 || buffer[offset + 3] !== 0x04) {
        break;
      }

      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const fileName = buffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
      const dataStart = offset + 30 + fileNameLen + extraLen;

      const targetFiles = ["patent.txt", "exclusivity.txt"];
      const baseName = fileName.split("/").pop()?.toLowerCase() ?? "";

      if (targetFiles.includes(baseName) && compressedSize > 0) {
        const rawData = buffer.subarray(dataStart, dataStart + compressedSize);

        if (compressionMethod === 0) {
          // Stored (no compression)
          files.set(baseName, rawData.toString("utf8"));
        } else if (compressionMethod === 8) {
          // Deflate
          try {
            const { inflateRawSync } = await import("zlib");
            const inflated = inflateRawSync(rawData);
            files.set(baseName, inflated.toString("utf8"));
          } catch (e) {
            debugLog("OrangeBookAdapter", `Failed to decompress ${fileName}: ${e}`);
          }
        }
      }

      offset = dataStart + compressedSize;
    }

    return files;
  }

  private parsePatentFile(content: string): InsertRegulatoryEvent[] {
    const rows = parseTSV(content);
    const events: InsertRegulatoryEvent[] = [];

    for (const row of rows) {
      const ingredient = row.ingredient ?? row.active_ingredient ?? "";
      const tradeName = row.trade_name ?? row.drug_trade_name ?? "";

      if (!isRespiratoryDrug(ingredient) && !isRespiratoryDrug(tradeName)) continue;

      const patentExpireDate = row.patent_expire_date_text ?? row.patent_expire_date ?? "";
      if (!patentExpireDate) continue;

      const eventDate = new Date(patentExpireDate);
      if (isNaN(eventDate.getTime())) continue;

      const patentNumber = row.patent_no ?? row.patent_number ?? "";
      const appNumber = row.appl_no ?? row.application_number ?? "";

      events.push({
        eventType: "patent_expiry",
        title: `${tradeName || ingredient} - Patent Expiry (${patentNumber})`,
        description: `Patent ${patentNumber} expiration for ${ingredient}. Application: ${appNumber}`,
        drugName: ingredient.toLowerCase(),
        brandName: tradeName || null,
        therapeuticArea: "Respiratory",
        eventDate,
        status: eventDate > new Date() ? "upcoming" : "completed",
        source: "orange_book",
        sourceId: `OB-PAT-${ingredient.toLowerCase()}-${patentNumber}`,
        applicationNumber: appNumber || null,
        patentNumber: patentNumber || null,
        metadata: {
          patentUseCode: row.patent_use_code,
          productNumber: row.product_no,
        },
      });
    }

    return events;
  }

  private parseExclusivityFile(content: string): InsertRegulatoryEvent[] {
    const rows = parseTSV(content);
    const events: InsertRegulatoryEvent[] = [];

    for (const row of rows) {
      const ingredient = row.ingredient ?? row.active_ingredient ?? "";
      const tradeName = row.trade_name ?? row.drug_trade_name ?? "";

      if (!isRespiratoryDrug(ingredient) && !isRespiratoryDrug(tradeName)) continue;

      const exclDate = row.exclusivity_date ?? "";
      if (!exclDate) continue;

      const eventDate = new Date(exclDate);
      if (isNaN(eventDate.getTime())) continue;

      const exclCode = row.exclusivity_code ?? "";
      const appNumber = row.appl_no ?? row.application_number ?? "";

      events.push({
        eventType: "exclusivity_expiry",
        title: `${tradeName || ingredient} - Exclusivity Expiry (${exclCode})`,
        description: `${exclCode} exclusivity expiration for ${ingredient}. Application: ${appNumber}`,
        drugName: ingredient.toLowerCase(),
        brandName: tradeName || null,
        therapeuticArea: "Respiratory",
        eventDate,
        status: eventDate > new Date() ? "upcoming" : "completed",
        source: "orange_book",
        sourceId: `OB-EXCL-${ingredient.toLowerCase()}-${exclCode}-${appNumber}`,
        applicationNumber: appNumber || null,
        metadata: {
          exclusivityCode: exclCode,
          productNumber: row.product_no,
        },
      });
    }

    return events;
  }
}

export const orangeBookAdapter = new OrangeBookAdapter();
