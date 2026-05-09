import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { kmlParser } from '@/lib/kml-parser';

/**
 * Cache the KML directory listing for 1 minute.
 * Fields are cold data — they don't change between requests during a typical session.
 */
export const revalidate = 60;

/**
 * Resolve the KML directory in this priority order:
 *   1. KML_FIELDS_DIR env var (recommended for production / Docker)
 *   2. <project_root>/data/KML Fields  (local dev — Next.js runs from web/)
 */
function resolveKmlDir(): string {
  const envDir = process.env.KML_FIELDS_DIR;
  if (envDir && envDir.length > 0) {
    return path.resolve(envDir);
  }
  return path.resolve(process.cwd(), '..', 'data', 'KML Fields');
}

const KML_FILENAME_PATTERN = /^[\w\-. ]+\.kml$/;

export async function GET() {
  const kmlDir = resolveKmlDir();

  try {
    const entries = await fs.readdir(kmlDir, { withFileTypes: true });

    const kmlFiles = entries
      .filter((entry) => entry.isFile() && KML_FILENAME_PATTERN.test(entry.name))
      .map((entry) => entry.name);

    const fields = await Promise.all(
      kmlFiles.map(async (file) => {
        const filePath = path.join(kmlDir, file);

        // Defense-in-depth: ensure we never read outside kmlDir.
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(kmlDir))) {
          return null;
        }

        const content = await fs.readFile(resolved, 'utf-8');
        const field = kmlParser.parseKMLFile(content);
        if (!field) return null;

        return {
          ...field,
          fileName: file,
          area: kmlParser.calculateArea(field),
          center: kmlParser.getCenter(field),
        };
      })
    );

    return NextResponse.json({ fields: fields.filter(Boolean) });
  } catch (error) {
    // Log internally with context, return generic message to clients.
    console.error('[/api/fields] Failed to read KML directory:', kmlDir, error);
    return NextResponse.json(
      { error: 'Failed to read KML files' },
      { status: 500 }
    );
  }
}
