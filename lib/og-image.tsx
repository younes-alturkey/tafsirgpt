import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";
export const ogAlt =
  "تفسير جي بي تي — نافذة مجانية على القرآن الكريم وتفاسيره";

function asset(rel: string): Buffer | null {
  try {
    return readFileSync(join(process.cwd(), rel));
  } catch {
    return null;
  }
}

/**
 * Renders one centered OG line. Satori (next/og) does NOT apply bidi reordering
 * to space-separated tokens here — it lays them out left-to-right in source
 * order while still shaping each token internally per its script. So every
 * Arabic line must have its WORD order pre-reversed (`reversed`) to read
 * right-to-left, while Latin runs like "Tafsir MCP" must keep their own internal
 * order — `orderWords` reverses the token sequence but flips each maximal run of
 * Latin tokens back so they still read left-to-right.
 *
 * The large title adds two more tweaks: a normal space between two big Arabic
 * words renders hugely wide, so the title joins its words with a thin space
 * (U+2009) via `tight` to stay compact; and that tight, nowrap title renders in
 * a full-width box pinned left (Satori ignores justify-content / auto-margins /
 * text-align for it), so it is centered with an explicit `padLeft`
 * (≈ (1060 content width − 584 text width) / 2).
 */
function orderWords(words: string[], reversed: boolean): string[] {
  if (!reversed) return words;
  const out = [...words].reverse();
  const isLatin = (w: string) => /[A-Za-z]/.test(w);
  // Re-flip each maximal run of Latin tokens so they read left-to-right again.
  for (let i = 0; i < out.length; ) {
    if (!isLatin(out[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && isLatin(out[j])) j++;
    for (let a = i, b = j - 1; a < b; a++, b--)
      [out[a], out[b]] = [out[b], out[a]];
    i = j;
  }
  return out;
}

function Line({
  children,
  size,
  color,
  weight = 400,
  marginTop = 0,
  reversed = false,
  tight = false,
  padLeft,
}: {
  children: string;
  size: number;
  color: string;
  weight?: number;
  marginTop?: number;
  reversed?: boolean;
  tight?: boolean;
  padLeft?: number;
}) {
  const words = children.split(/\s+/);
  const ordered = orderWords(words, reversed);
  const text = ordered.join(tight ? "\u2009" : " ");
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
        marginTop,
      }}
    >
      <div
        style={{
          display: "flex",
          whiteSpace: "nowrap",
          fontSize: size,
          fontWeight: weight,
          color,
          lineHeight: 1.2,
          ...(padLeft != null ? { paddingLeft: padLeft } : {}),
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function renderOgImage() {
  const arReg = asset("assets/fonts/Almarai-Regular.ttf");
  const arBold = asset("assets/fonts/Almarai-Bold.ttf");
  const logoBytes = asset("public/logo.svg");
  const logo = logoBytes
    ? `data:image/svg+xml;base64,${logoBytes.toString("base64")}`
    : null;

  const fonts: any[] = [];
  if (arReg)
    fonts.push({ name: "Almarai", data: arReg, weight: 400, style: "normal" });
  if (arBold)
    fonts.push({ name: "Almarai", data: arBold, weight: 700, style: "normal" });

  // Reorder a multi-word Arabic segment so it reads right-to-left (see `Line`).
  const ar = (s: string) => orderWords(s.split(/\s+/), true).join(" ");

  // Feature strip, in natural reading order. Rendered as a flex row (reversed,
  // since Satori lays tokens left-to-right) so each "·" is its own evenly-spaced
  // item — a clean separator rather than a lone token floating in wide gaps.
  const FEATURES = ["٢٨ مصدر تفسير", "القراءات", "تحليل الكلمات", "عربي وإنجليزي"];
  const featureRow: any[] = [];
  [...FEATURES].reverse().forEach((g, i) => {
    if (i > 0)
      featureRow.push(
        <div key={`sep-${i}`} style={{ display: "flex", margin: "0 14px", color: "#7a7058" }}>
          ·
        </div>,
      );
    featureRow.push(
      <div key={`grp-${i}`} style={{ display: "flex" }}>
        {ar(g)}
      </div>,
    );
  });

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "56px 70px",
        fontFamily: "Almarai",
        color: "#f3ecd9",
        backgroundColor: "#0c0a07",
        backgroundImage:
          "radial-gradient(circle at 50% 18%, rgba(183,152,81,0.24), rgba(12,10,7,0) 60%)",
      }}
    >
      <Line size={82} weight={700} color="#d4b87a" reversed tight padLeft={238}>
        تي بي جي تفسير
      </Line>

      <Line size={33} color="#f3ecd9" marginTop={22} reversed>
        نافذة مجانية على القرآن الكريم وتفاسيره
      </Line>

      <Line size={25} color="#a99b80" marginTop={10} reversed>
        محتوًى موثّق مباشرةً من خادم Tafsir MCP
      </Line>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          marginTop: 26,
          fontSize: 23,
          color: "#c9a96e",
        }}
      >
        {featureRow}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 44,
          paddingTop: 26,
          borderTop: "1px solid rgba(183,152,81,0.30)",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={210} height={51} alt="" />
        ) : null}
        <div style={{ display: "flex", fontSize: 24, color: "#8a8170" }}>
          {ar("بدعم من")}
        </div>
      </div>
    </div>,
    {
      width: ogSize.width,
      height: ogSize.height,
      fonts: fonts.length ? fonts : undefined,
    },
  );
}
