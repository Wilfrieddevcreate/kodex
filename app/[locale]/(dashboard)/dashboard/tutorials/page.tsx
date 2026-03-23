import { prisma } from "@/app/lib/prisma";
import TutorialsClient from "./TutorialsClient";

export default async function TutorialsPage() {
  const [faqs, tutorials] = await Promise.all([
    prisma.faq.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.tutorial.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <TutorialsClient
      faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))}
      tutorials={tutorials.map((t) => ({
        id: t.id,
        title: t.title,
        videoUrl: t.videoUrl,
        description: t.description,
        isManagedGuide: t.isManagedGuide,
      }))}
    />
  );
}
