// URL parsing for embeddable media resources (YouTube / Google Drive). Turns a
// pasted share/watch URL into the canonical iframe-embed URL stored on a YEmbed
// shape. Returns null when the URL isn't recognised so the UI can show an error.

export interface ParsedEmbed {
  embedType: "youtube" | "gdrive";
  // Canonical iframe src.
  url: string;
}

// Accepts the common YouTube URL shapes:
//   https://www.youtube.com/watch?v=<id>
//   https://youtu.be/<id>
//   https://www.youtube.com/embed/<id>
//   https://www.youtube.com/shorts/<id>
// and (separately) Google Drive file links:
//   https://drive.google.com/file/d/<id>/view?usp=sharing
//   https://drive.google.com/open?id=<id>
//   https://drive.google.com/uc?id=<id>
export function parseEmbedUrl(raw: string): ParsedEmbed | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // ----- YouTube -----------------------------------------------------------
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const id = youtubeId(u, host);
    if (id) {
      return {
        embedType: "youtube",
        url: `https://www.youtube.com/embed/${id}`,
      };
    }
    return null;
  }

  // ----- Google Drive ------------------------------------------------------
  if (host === "drive.google.com") {
    const id = driveId(u);
    if (id) {
      return {
        embedType: "gdrive",
        url: `https://drive.google.com/file/d/${id}/preview`,
      };
    }
    return null;
  }

  return null;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

function youtubeId(u: URL, host: string): string | null {
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && YT_ID.test(id) ? id : null;
  }
  const v = u.searchParams.get("v");
  if (v && YT_ID.test(v)) return v;
  // /embed/<id> or /shorts/<id>
  const segs = u.pathname.split("/").filter(Boolean);
  if ((segs[0] === "embed" || segs[0] === "shorts") && segs[1] && YT_ID.test(segs[1])) {
    return segs[1];
  }
  return null;
}

function driveId(u: URL): string | null {
  // /file/d/<id>/...
  const segs = u.pathname.split("/").filter(Boolean);
  const dIdx = segs.indexOf("d");
  if (segs[0] === "file" && dIdx >= 0 && segs[dIdx + 1]) return segs[dIdx + 1]!;
  // ?id=<id> (open / uc)
  const id = u.searchParams.get("id");
  return id || null;
}
