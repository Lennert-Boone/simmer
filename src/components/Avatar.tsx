/**
 * Profielfoto met initialen als terugval. Bewust een gewone <img> en geen
 * next/image: de foto's komen van Google en dat zou remotePatterns-configuratie
 * vergen voor één klein rondje.
 */
export default function Avatar({
  naam,
  email,
  avatarUrl,
  formaat = 36,
}: {
  naam: string | null;
  email: string;
  avatarUrl: string | null;
  formaat?: number;
}) {
  const bron = naam?.trim() || email;
  const initialen = bron
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((deel) => deel[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={formaat}
        height={formaat}
        // Zonder dit weigert Google de afbeelding met een 403.
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full object-cover"
        style={{ width: formaat, height: formaat }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="cijfer flex shrink-0 items-center justify-center rounded-full bg-kruid text-white"
      style={{ width: formaat, height: formaat, fontSize: Math.round(formaat * 0.36) }}
    >
      {initialen || "?"}
    </span>
  );
}
