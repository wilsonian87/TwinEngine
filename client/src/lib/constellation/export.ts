/**
 * Canvas Export Utility
 *
 * Phase 12A.3: Export functionality for competitive orbit visualization
 *
 * Provides PNG and CSV export capabilities for the constellation view
 */

/**
 * Export the Three.js canvas as a PNG image
 *
 * @param filename - The filename for the downloaded image (without extension)
 * @returns Promise that resolves when download starts
 */
export async function exportCanvasToPng(filename: string = 'competitive-orbit'): Promise<void> {
  // Find the canvas element (React Three Fiber creates it inside a container)
  const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error('Canvas element not found. Make sure the visualization is rendered.');
  }

  // WebGL canvases need special handling - they need preserveDrawingBuffer
  // For R3F, we need to read the pixel data and redraw
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

  if (!gl) {
    // Fallback for non-WebGL canvas
    const dataUrl = canvas.toDataURL('image/png');
    downloadDataUrl(dataUrl, `${filename}.png`);
    return;
  }

  // For WebGL, we need to create a temporary canvas and copy the data
  const width = canvas.width;
  const height = canvas.height;

  // Read pixels from WebGL canvas
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // Create a 2D canvas to flip and draw the image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create 2D canvas context');
  }

  // Create ImageData and flip vertically (WebGL coordinates are flipped)
  const imageData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((height - 1 - y) * width + x) * 4;
      const dstIdx = (y * width + x) * 4;

      imageData.data[dstIdx] = pixels[srcIdx];
      imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
      imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
      imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Export as PNG
  const dataUrl = tempCanvas.toDataURL('image/png');
  downloadDataUrl(dataUrl, `${filename}.png`);
}

/**
 * Download a data URL as a file
 */
function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download CSV content as a file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate a timestamp-based filename
 */
export function generateTimestampFilename(prefix: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}`;
}

/**
 * Export competitive data as CSV from the API
 *
 * @param exportType - Type of export (signals, alerts, portfolio-alerts)
 * @param params - Additional parameters (hcpId, therapeuticArea)
 */
export async function exportCompetitiveData(
  exportType: 'signals' | 'alerts' | 'portfolio-alerts',
  params?: {
    hcpId?: string;
    therapeuticArea?: string;
  }
): Promise<void> {
  let url = '/api/competitive/export';

  switch (exportType) {
    case 'signals':
      url = params?.therapeuticArea
        ? `/api/competitive/export/by-ta/${encodeURIComponent(params.therapeuticArea)}/signals`
        : '/api/competitive/export/signals';
      break;
    case 'alerts':
      if (!params?.hcpId) {
        throw new Error('hcpId is required for alerts export');
      }
      url = `/api/competitive/export/alerts/${params.hcpId}`;
      break;
    case 'portfolio-alerts':
      url = '/api/competitive/export/portfolio-alerts';
      break;
  }

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to export competitive data: ${response.statusText}`);
  }

  // Get filename from Content-Disposition header or generate one
  const disposition = response.headers.get('Content-Disposition');
  let filename = generateTimestampFilename(`competitive-${exportType}`);

  if (disposition) {
    const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  const csvContent = await response.text();
  downloadCsv(csvContent, filename);
}
