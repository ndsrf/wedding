/**
 * Build script: Marta & Carlos — Burgundy invitation template
 *
 * Generates a .nupcinv file with:
 *   - An image-map block (no image bundled — you upload your own designed PNG)
 *   - Pre-configured hotspots matching the layout in the reference image
 *   - Two panel blocks (Itinerario, Regalo) ready to fill in
 *
 * After importing, open the image-map block editor and upload your invitation PNG.
 * Drag the hotspots to align with the Itinerario, RSVP and Regalo areas.
 *
 * Run: node scripts/build-marta-carlos-template.mjs
 *
 * Hotspot percentages are calibrated for the reference image (portrait, ~555×830).
 * If your image has a different aspect ratio, adjust in the builder.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { deflateRawSync } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'uploads');

// ============================================================================
// ZIP utility (mirrors src/lib/zip.ts)
// ============================================================================

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function createZip(entries) {
  const localParts = [];
  const centralDirParts = [];
  let localOffset = 0;
  const { time: dosTime, date: dosDate } = toDosDateTime(new Date('2026-06-14T10:00:00'));

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const checksum = crc32(entry.data);
    const compressed = deflateRawSync(entry.data, { level: 6 });

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const cdEntry = Buffer.alloc(46 + nameBuf.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);
    cdEntry.writeUInt16LE(20, 4);
    cdEntry.writeUInt16LE(20, 6);
    cdEntry.writeUInt16LE(0x0800, 8);
    cdEntry.writeUInt16LE(8, 10);
    cdEntry.writeUInt16LE(dosTime, 12);
    cdEntry.writeUInt16LE(dosDate, 14);
    cdEntry.writeUInt32LE(checksum, 16);
    cdEntry.writeUInt32LE(compressed.length, 20);
    cdEntry.writeUInt32LE(entry.data.length, 24);
    cdEntry.writeUInt16LE(nameBuf.length, 28);
    cdEntry.writeUInt16LE(0, 30);
    cdEntry.writeUInt16LE(0, 32);
    cdEntry.writeUInt16LE(0, 34);
    cdEntry.writeUInt16LE(0, 36);
    cdEntry.writeUInt32LE(0, 38);
    cdEntry.writeUInt32LE(localOffset, 42);
    nameBuf.copy(cdEntry, 46);

    localParts.push(local, compressed);
    centralDirParts.push(cdEntry);
    localOffset += local.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralDirParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(localOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

// ============================================================================
// DESIGN
// Hotspot percentages calibrated for the reference image (portrait ~555×830).
// top/left/width/height are all % of image dimensions.
// ============================================================================

const PANEL_ITINERARIO_ID = 'panel-itinerario-mc-2026';
const PANEL_REGALO_ID = 'panel-regalo-mc-2026';
const IMAGEMAP_ID = 'imagemap-mc-2026';

function buildDesign() {
  return {
    globalStyle: {
      backgroundColor: '#3D0C11',
    },
    blocks: [
      // --- Image map: upload your designed invitation PNG here ---
      {
        id: IMAGEMAP_ID,
        type: 'image-map',
        _version: 1,
        // src is empty — upload your invitation image in the builder
        src: '',
        alt: 'Invitación de boda Marta & Carlos — 29 de Agosto 2026',
        hotspots: [
          // Itinerario badge (bottom-left)
          {
            id: 'hs-itinerario',
            top: 64.9,
            left: 3.6,
            width: 38.8,
            height: 21.2,
            action: 'open-panel',
            panelId: PANEL_ITINERARIO_ID,
          },
          // Formulario RSVP (right, scalloped circle)
          {
            id: 'hs-rsvp',
            top: 63.0,
            left: 46.0,
            width: 50.0,
            height: 19.0,
            action: 'scroll-to-rsvp',
          },
          // Regalo badge (bottom-right)
          {
            id: 'hs-regalo',
            top: 84.5,
            left: 46.0,
            width: 50.0,
            height: 12.5,
            action: 'open-panel',
            panelId: PANEL_REGALO_ID,
          },
        ],
      },

      // --- Panel: Itinerario ---
      {
        id: PANEL_ITINERARIO_ID,
        type: 'panel',
        _version: 1,
        title: {
          ES: 'Itinerario',
          EN: 'Itinerary',
          FR: 'Calendrier',
          IT: 'Itinerario',
          DE: 'Zeitplan',
        },
        content: {
          ES: '<p><strong>12:00</strong> — Llegada de invitados</p><p><strong>13:00</strong> — Ceremonia civil</p><p><strong>14:00</strong> — Cocktail de bienvenida</p><p><strong>15:30</strong> — Banquete</p><p><strong>18:00</strong> — Baile y celebración</p><p><strong>00:00</strong> — ¡Sorpresa!</p>',
          EN: '<p><strong>12:00</strong> — Guest arrival</p><p><strong>13:00</strong> — Civil ceremony</p><p><strong>14:00</strong> — Welcome cocktail</p><p><strong>15:30</strong> — Banquet</p><p><strong>18:00</strong> — Dancing &amp; celebration</p><p><strong>00:00</strong> — Surprise!</p>',
          FR: '<p><strong>12:00</strong> — Arrivée des invités</p><p><strong>13:00</strong> — Cérémonie civile</p><p><strong>14:00</strong> — Cocktail de bienvenue</p><p><strong>15:30</strong> — Banquet</p><p><strong>18:00</strong> — Danse et célébration</p><p><strong>00:00</strong> — Surprise !</p>',
          IT: '<p><strong>12:00</strong> — Arrivo degli ospiti</p><p><strong>13:00</strong> — Cerimonia civile</p><p><strong>14:00</strong> — Cocktail di benvenuto</p><p><strong>15:30</strong> — Banchetto</p><p><strong>18:00</strong> — Ballo e celebrazione</p><p><strong>00:00</strong> — Sorpresa!</p>',
          DE: '<p><strong>12:00</strong> — Ankunft der Gäste</p><p><strong>13:00</strong> — Standesamtliche Trauung</p><p><strong>14:00</strong> — Willkommens-Cocktail</p><p><strong>15:30</strong> — Bankett</p><p><strong>18:00</strong> — Tanz &amp; Feier</p><p><strong>00:00</strong> — Überraschung!</p>',
        },
        style: {
          backgroundColor: '#5C1A1A',
          textColor: '#F5ECD7',
          borderColor: '#C4976A',
          borderStyle: 'frame',
          fontFamily: 'Georgia, serif',
        },
      },

      // --- Panel: Regalo ---
      {
        id: PANEL_REGALO_ID,
        type: 'panel',
        _version: 1,
        title: {
          ES: 'Regalo',
          EN: 'Gift',
          FR: 'Cadeau',
          IT: 'Regalo',
          DE: 'Geschenk',
        },
        content: {
          ES: '<p>Tu presencia es nuestro mejor regalo.</p><p>Si deseas hacernos un obsequio, puedes contribuir a nuestra luna de miel:</p><p><strong>Banco:</strong> —<br/><strong>Titular:</strong> Marta García &amp; Carlos López<br/><strong>CLABE:</strong> —</p>',
          EN: '<p>Your presence is our greatest gift.</p><p>If you wish to give us something, you can contribute to our honeymoon fund:</p><p><strong>Bank:</strong> —<br/><strong>Account holder:</strong> Marta García &amp; Carlos López<br/><strong>IBAN:</strong> —</p>',
          FR: '<p>Ta présence est notre plus beau cadeau.</p><p>Si tu souhaites nous offrir quelque chose, tu peux contribuer à notre lune de miel :</p><p><strong>Banque :</strong> —<br/><strong>Titulaire :</strong> Marta García &amp; Carlos López<br/><strong>IBAN :</strong> —</p>',
          IT: '<p>La tua presenza è il nostro regalo più grande.</p><p>Se desideri farci un dono, puoi contribuire alla nostra luna di miele:</p><p><strong>Banca:</strong> —<br/><strong>Intestatario:</strong> Marta García &amp; Carlos López<br/><strong>IBAN:</strong> —</p>',
          DE: '<p>Deine Anwesenheit ist unser schönstes Geschenk.</p><p>Wenn du uns eine Freude machen möchtest, kannst du zu unserer Flitterwochen beitragen:</p><p><strong>Bank:</strong> —<br/><strong>Kontoinhaber:</strong> Marta García &amp; Carlos López<br/><strong>IBAN:</strong> —</p>',
        },
        style: {
          backgroundColor: '#5C1A1A',
          textColor: '#F5ECD7',
          borderColor: '#C4976A',
          borderStyle: 'frame',
          fontFamily: 'Georgia, serif',
        },
      },
    ],
    // No bundled images — user uploads their own
    imageMap: {},
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('Building Marta & Carlos invitation template...');

  const manifest = {
    format_version: '1.0',
    exported_at: '2026-06-14T10:00:00.000Z',
    template_name: 'Marta & Carlos — Burgundy',
  };

  const design = buildDesign();

  const entries = [
    { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
    { name: 'design.json', data: Buffer.from(JSON.stringify(design, null, 2), 'utf8') },
  ];

  const zipBuf = createZip(entries);
  const outPath = path.join(OUT_DIR, 'Invitacion Marta Carlos Nupci.nupcinv');
  writeFileSync(outPath, zipBuf);

  console.log(`  Output: ${outPath} (${zipBuf.length} bytes)`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Import this file in the builder');
  console.log('  2. Click the image-map block, upload your invitation PNG/JPG');
  console.log('  3. Fine-tune the 3 hotspot positions if needed');
  console.log('  4. Fill in Itinerario and Regalo panel content');
  console.log('Done!');
}

main();
