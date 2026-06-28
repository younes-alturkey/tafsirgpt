/**
 * Export the current surface (chat transcript or explore findings) to PDF.
 *
 * We deliberately drive the browser's own print pipeline rather than rasterizing
 * the DOM (html2canvas + jsPDF). The native engine gives us three things that
 * matter for a Quran/Tafsir document and that a canvas snapshot cannot:
 *   • vector, selectable text — Arabic shaping and copy-paste survive intact;
 *   • faithful fonts/colours at any zoom — no blurry bitmap;
 *   • real pagination — `break-inside`/`break-after` rules (see globals.css)
 *     decide where a page ends, so verses, cards and headings never get sliced
 *     through the middle.
 *
 * All of the layout work lives in the `@media print` block; this just opens the
 * dialog. "Save as PDF" in that dialog produces the shareable file.
 */
export function exportToPdf(): void {
  if (typeof window === "undefined" || typeof window.print !== "function") return;
  window.print();
}
