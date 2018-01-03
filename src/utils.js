export function getCanvas(w, h, offscreen) {
  // if (offscreen) ...
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
