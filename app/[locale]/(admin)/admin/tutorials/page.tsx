import { prisma } from "@/app/lib/prisma";
import TutorialsAdmin from "./TutorialsAdmin";

export default async function AdminTutorialsPage() {
  const [faqs, tutorials] = await Promise.all([
    prisma.faq.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.tutorial.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <TutorialsAdmin
      faqs={faqs.map((f) => ({ ...f, createdAt: f.createdAt.toISOString(), updatedAt: f.updatedAt.toISOString() }))}
      tutorials={tutorials.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() }))}
    />
  );
}
