import { readItemImage } from "@/lib/read-item"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_IMAGE_CHARS = 8_000_000

export async function POST(request: Request) {
  const body = (await request.json()) as { data?: unknown; mimeType?: unknown }
  const data = typeof body.data === "string" ? body.data : ""
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : ""
  if (!data || !mimeType.startsWith("image/")) {
    return Response.json({ error: "Envie uma imagem do item." }, { status: 400 })
  }
  if (data.length > MAX_IMAGE_CHARS) {
    return Response.json({ error: "A imagem passou de 8 MB." }, { status: 413 })
  }
  try {
    return Response.json(await readItemImage({ data, mimeType }))
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Falha ao ler a imagem."
    const status = message.includes("GEMINI_API_KEY") ? 400 : 502
    return Response.json({ error: message }, { status })
  }
}
