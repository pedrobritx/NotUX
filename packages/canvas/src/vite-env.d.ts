// Ambient declaration so this package's standalone `tsc --noEmit` accepts
// Vite's `?url` asset imports (used for the pdf.js worker in assets/pdf.ts).
// The web app gets the same declaration from `vite/client`; the canvas package
// does not depend on Vite, so it is declared locally here.
declare module "*?url" {
  const src: string;
  export default src;
}
