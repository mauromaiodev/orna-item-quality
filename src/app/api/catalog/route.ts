import { listCatalog } from "@/lib/codex"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET() {
  try {
    return Response.json({ items: await listCatalog() })
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Falha ao consultar o Codex."
    return Response.json({ error: message }, { status: 502 })
  }
}
