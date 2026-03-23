import { prisma } from "@/app/lib/prisma";
import CallsAdmin from "./CallsAdmin";

export default async function AdminCallsPage() {
  // Only fetch pairs for the form (lightweight). Calls loaded via API with infinite scroll.
  const pairs = await prisma.tradingPair.findMany({ where: { active: true }, orderBy: { base: "asc" } });

  return (
    <CallsAdmin
      pairs={pairs.map((p) => ({ id: p.id, label: `${p.base}/${p.quote}` }))}
    />
  );
}
