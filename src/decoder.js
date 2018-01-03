export default class Decoder {
  canvas;
  ctx;
  img;
  tileSize;
  w;
  h;

  constructor(dest, destCtx) {
    if (dest instanceof HTMLCanvasElement) {
      this.canvas = dest;
      this.ctx = destCtx || this.canvas.getContext('2d');
      this.w = dest.width;
      this.h = dest.height;
      // img = new Image(); // TODO: Test strategy of reusing same image object
    } else if (dest instanceof HTMLImageElement) {
      this.img = dest;
    } else throw new Error('Supported element not provided to decoder');
  }

  plotTile(image, x, y) {
    const t = this.tileSize;
    this.ctx.drawImage(image, 0, 0, t, t, x, y, t, t);
  }

  onKeyFrame(image) {
    if (!this.w) {
      this.w = this.width;
      this.h = this.height;
    }
    this.ctx.drawImage(image, 0, 0, this.w, this.h);
  }

  decode(data) {
    if (typeof data === 'string') {
      if (this.img) {
        this.img.onload = this.onKeyFrame.bind(this, this.img);
        this.img.src = data;
      } else {
        const image = new Image();
        image.onload = this.onKeyFrame.bind(this, image);
        image.src = data;
      }
    } else {
      if (!this.w) return undefined;
      if (!this.tileSize) this.tileSize = data[data.length - 1];
      const len = data.length;
      for (let i = 0; i < len; i += 3) {
        const x = data[i] * this.tileSize;
        const y = data[i + 1] * this.tileSize;
        const image = new Image();
        image.onload = this.plotTile.bind(this, image, x, y);
        image.src = data[i + 2];
      }
    }
    return undefined;
  }
}
