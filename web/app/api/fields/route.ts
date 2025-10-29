import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { kmlParser } from '@/lib/kml-parser';

export async function GET() {
  try {
    const kmlDir = path.join(process.cwd(), '..', 'data', 'KML Fields');
    const files = await fs.readdir(kmlDir);
    const kmlFiles = files.filter((file) => file.endsWith('.kml'));

    const fields = await Promise.all(
      kmlFiles.map(async (file) => {
        const filePath = path.join(kmlDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const field = kmlParser.parseKMLFile(content);

        if (field) {
          return {
            ...field,
            fileName: file,
            area: kmlParser.calculateArea(field),
            center: kmlParser.getCenter(field),
          };
        }
        return null;
      })
    );

    return NextResponse.json({
      fields: fields.filter(Boolean),
    });
  } catch (error) {
    console.error('Error reading KML files:', error);
    return NextResponse.json(
      { error: 'Failed to read KML files' },
      { status: 500 }
    );
  }
}
