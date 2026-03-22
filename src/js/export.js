import { encryptJson } from "./crypto.js";

function downloadTextFile(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportIdeasEncrypted(ideas, passphrase) {
  const exportBody = {
    version: 1,
    exportedAt: new Date().toISOString(),
    totalIdeas: ideas.length,
    ideas: ideas.map((idea) => ({
      number: idea.number,
      title: idea.title,
      category: idea.category,
      content: idea.content,
      audio: idea.audio || null,
      createdAt: idea.createdAt
    }))
  };

  const encrypted = await encryptJson(exportBody, passphrase);
  const exportPayload = {
    format: "eureka-encrypted-export",
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    encrypted
  };

  downloadTextFile(
    `eureka-export-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(exportPayload, null, 2)
  );
}
