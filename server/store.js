import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, 'db.json');

async function ensureDbExists() {
  try {
    await access(dbPath, constants.F_OK);
  } catch {
    const initial = { tickets: [], notifications: [], ticketCounter: 1 };
    await writeFile(dbPath, JSON.stringify(initial, null, 2), 'utf8');
  }
}

export async function readDb() {
  await ensureDbExists();
  const text = await readFile(dbPath, 'utf8');
  return JSON.parse(text || '{"tickets":[],"notifications":[],"ticketCounter":1}');
}

export async function writeDb(db) {
  await writeFile(dbPath, JSON.stringify(db, null, 2), 'utf8');
}
