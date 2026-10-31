function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]!);
}

export function buildCampaignHtml(body: string, imageCid: string) {
  const paragraphs = body
    .split("\n\n")
    .map((paragraph) => `<p style="margin:0 0 16px">${escapeHtml(paragraph)}</p>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.55;max-width:600px">${paragraphs}<img src="cid:${imageCid}" alt="Happy Halloween" style="display:block;width:100%;height:auto;border:0;border-radius:8px" /></div>`;
}

export function renderCampaignTemplate(template: string, recipientName: string | null) {
  return template.replaceAll("{{name}}", recipientName?.trim() || "student");
}
