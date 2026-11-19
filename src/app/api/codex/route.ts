import { findCodexItem, findCodexItemByUrl } from "@/lib/codex"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const url = params.get("url")?.trim() ?? ""
  const name = params.get("name")?.trim() ?? ""
  if (!url && !name) {
    return Response.json({ error: "Informe o item." }, { status: 400 })
  }
  try {
    if (url) return Response.json({ item: await findCodexItemByUrl(url), candidates: [] })
    return Response.json(await findCodexItem(name))
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Falha ao consultar o Codex."
    return Response.json({ error: message }, { status: 502 })
  }
}
