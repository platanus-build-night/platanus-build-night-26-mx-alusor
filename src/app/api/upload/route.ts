import { NextResponse } from "next/server";
import { uploadTemplate, createBuildSession } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/upload — multipart .docx → Files API (file_id) → create the stateful
// Managed-Agent build session (docx mounted). Returns { sessionId, filename }.
// DEV: no Blob/Mongo needed; the session IS the handle. (Blob/Mongo come in phase 3.)
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".docx") && !name.endsWith(".doc")) {
    return NextResponse.json({ error: "Sube un documento de Word (.docx)." }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo supera 25 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileId = await uploadTemplate(bytes, file.name);
  const sessionId = await createBuildSession(fileId, file.name);
  return NextResponse.json({ sessionId, fileId, filename: file.name });
}
