// Perceived-brightness contrast helper (ITU-R BT.601), used to pick
// readable label text color against a vehicle's own body_color on the
// Live Map markers — same idea as the color swatches on the Vehicles page.
export function getContrastTextColor(hexColor) {
  if (!hexColor || hexColor.length < 7) return "#111827";

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 150 ? "#111827" : "#ffffff";
}
