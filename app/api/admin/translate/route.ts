import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { title, description } = await request.json();

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const prompt = `You are a professional translator. Translate the following news article from French to English, Spanish, and Turkish. Keep the tone professional and accurate. Return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

Title (French): ${title}
Description (French): ${description}

Return this exact JSON format:
{"en":{"title":"...","description":"..."},"es":{"title":"...","description":"..."},"tr":{"title":"...","description":"..."}}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "";

    // Extract JSON from response
    let translations;
    try {
      // Try direct parse
      translations = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translations = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json({ error: "Translation failed - invalid response" }, { status: 500 });
      }
    }

    return NextResponse.json({ translations });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
