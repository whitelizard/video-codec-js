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

  plotTiles(image, data) {
    const t = this.tileSize;
    const len = data.length;
    for (let i = 4; i < len; i += 1) {
      const id = data[i];
      const tx = Math.floor(id / 1000);
      const ty = id % 1000;
      const x = tx * this.tileSize;
      const y = ty * this.tileSize;
      this.ctx.drawImage(image, t * i, 0, t * (i + 1), t, x, y, t, t);
    }
  }

  onKeyFrame(image) {
    if (!this.w) {
      this.w = this.width;
      this.h = this.height;
    }
    this.ctx.drawImage(image, 0, 0, this.w, this.h);
  }

  decode(data) {
    if (data[2] === 0) {
      // keyframe
      if (this.img) {
        this.img.onload = this.onKeyFrame.bind(this, this.img);
        this.img.src = data[1];
      } else {
        const image = new Image();
        image.onload = this.onKeyFrame.bind(this, image);
        image.src = data[1];
      }
    } else {
      if (!this.w) return undefined;
      if (!this.tileSize) this.tileSize = data[2];
      const image = new Image();
      image.onload = this.plotTiles.bind(this, image, data);
      image.src = data[1];
    }
    return undefined;
  }
}
