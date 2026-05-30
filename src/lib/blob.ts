import { put, type PutBlobResult } from "@vercel/blob";

/** Store the uploaded .docx (public; random suffix to avoid collisions). */
export async function uploadDocx(
  filename: string,
  body: Buffer | Blob | ArrayBuffer,
): Promise<PutBlobResult> {
  return put(`uploads/${filename}`, body, {
    access: "public",
    addRandomSuffix: true,
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Publish the generated single-file mini-app. Prefer a NEW slug per refine
 * (the Blob CDN can serve a stale overwrite for ~60s), but allowOverwrite is
 * supported for same-slug republishes.
 */
export async function publishArtifact(
  slug: string,
  html: string,
): Promise<PutBlobResult> {
  return put(`apps/${slug}.html`, html, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "text/html; charset=utf-8",
  });
}
