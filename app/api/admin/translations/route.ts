import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const LOCALES = ["en", "fr", "es", "tr"];
const MESSAGES_DIR = path.join(process.cwd(), "messages");

// Flatten nested JSON: { "a": { "b": "c" } } → { "a.b": "c" }
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value ?? "");
    }
  }
  return result;
}

// Unflatten: { "a.b": "c" } → { "a": { "b": "c" } }
function unflatten(obj: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

// GET: read all translation files
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const translations: Record<string, Record<string, string>> = {};

    for (const locale of LOCALES) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      const content = await readFile(filePath, "utf-8");
      translations[locale] = flatten(JSON.parse(content));
    }

    // Collect all unique keys across all locales
    const allKeys = new Set<string>();
    for (const locale of LOCALES) {
      for (const key of Object.keys(translations[locale])) {
        allKeys.add(key);
      }
    }

    // Build rows: { key, en, fr, es, tr, section }
    const rows = Array.from(allKeys).sort().map((key) => {
      const section = key.split(".")[0];
      return {
        key,
        section,
        en: translations.en?.[key] || "",
        fr: translations.fr?.[key] || "",
        es: translations.es?.[key] || "",
        tr: translations.tr?.[key] || "",
      };
    });

    // Extract unique sections
    const sections = [...new Set(rows.map((r) => r.section))].sort();

    return NextResponse.json({ rows, sections });
  } catch (err) {
    console.error("Read translations error:", err);
    return NextResponse.json({ error: "Failed to read translations" }, { status: 500 });
  }
}

// PUT: update a single translation
export async function PUT(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { key, locale, value } = await request.json();

    if (!key || !locale || !LOCALES.includes(locale)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const content = await readFile(filePath, "utf-8");
    const json = JSON.parse(content);
    const flat = flatten(json);

    flat[key] = value;

    const unflattened = unflatten(flat);
    await writeFile(filePath, JSON.stringify(unflattened, null, 2) + "\n", "utf-8");

    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    console.error("Update translation error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
