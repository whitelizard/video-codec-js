import Decoder from './decode';

export function getCanvasEl(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export default class Encoder {
  tileSize = 20;
  w = 320;
  h = 240;
  numOfTiles = 192;
  keyFrameDelay = 6000;
  imgEncoding = 'webp';
  keyFrameQuality = 0.4;
  tileQuality = 0.25;
  pixelThreshold = 3;
  diffThreshold = 20;

  srcVideo;
  srcCanvas;
  srcCtx;
  resultCanvas;
  rctx;
  tileCanvas;
  tctx;

  vidW;
  vidH;
  timer;
  keyInstead = true;
  decoder;

  constructor(src, codecParams) {
    if (!src) throw new Error('Insufficient argument');
    if (codecParams) {
      if (codecParams.keyFrameQuality) this.keyFrameQuality = codecParams.keyFrameQuality;
      if (codecParams.tileQuality) this.tileQuality = codecParams.tileQuality;
      if (codecParams.imgEncoding) this.imgEncoding = codecParams.imgEncoding;
      if (codecParams.keyFrameDelay) this.keyFrameDelay = codecParams.keyFrameDelay;
      if (codecParams.pixelThreshold) this.pixelThreshold = codecParams.pixelThreshold;
      if (codecParams.tileSize) this.tileSize = codecParams.tileSize;
      if (codecParams.diffThreshold) this.diffThreshold = codecParams.diffThreshold;
      if (codecParams.w) {
        this.w = codecParams.w;
        if (!codecParams.h) this.h = Math.floor(this.w * 3 / 4);
        else this.h = codecParams.h;
        if (this.w % this.tileSize + this.h % this.tileSize > 0) {
          throw new Error('Unsupported frame size');
        }
        this.numOfTiles = this.w / this.tileSize * (this.h / this.tileSize);
      }
    }
    this.vidW = src.width;
    this.vidH = src.height;
    if (src instanceof HTMLCanvasElement) {
      this.srcCanvas = src;
      this.srcCtx = src.getContext('2d');
    } else if (src instanceof HTMLVideoElement) {
      this.srcVideo = src;
      this.srcCanvas = getCanvasEl(this.w, this.h);
      this.srcCtx = this.srcCanvas.getContext('2d');
    } else throw new Error('First argument not of type HTMLCanvasElement or HTMLVideoElement');
    this.resultCanvas = getCanvasEl(this.w, this.h);
    this.rctx = this.resultCanvas.getContext('2d');
    this.tileCanvas = getCanvasEl(this.tileSize, this.tileSize);
    this.tctx = this.tileCanvas.getContext('2d');
    this.decoder = new Decoder(this.resultCanvas, this.rctx);
  }

  frameDiff(f1, f2) {
    const d = f1.data;
    const e = f2.data;
    if (d.length !== e.length) throw new Error('Frames not same size!');
    const lenX = this.w; // TODO: why not just use w?
    const lenY = this.h;
    const coordMap = new Map();
    // TODO: Set instead of {}? xxyy as one number to store in the Set
    // { 403: 5, 1406: 7, 1512: 3 }
    // x > 4 => [403, 1406]
    for (let x = 0; x < lenX; x += 1) {
      for (let y = 0; y < lenY; y += 1) {
        const i = (y * this.w + x) * 4;
        const a1 = 0.2 * d[i] + 0.7 * d[i + 1] + 0.1 * d[i + 2];
        const a2 = 0.2 * e[i] + 0.7 * e[i + 1] + 0.1 * e[i + 2];
        const delta = Math.abs(a1 - a2);
        if (delta > this.diffThreshold) {
          // d[i] = 255;
          const mx = Math.floor(x / this.tileSize);
          const my = Math.floor(y / this.tileSize);
          const k = mx * 100 + my;
          if (!coordMap.has(k)) coordMap.set(k, 1);
          else coordMap.set(k, coordMap.get(k) + 1);
        }
      }
    }
    return coordMap;
  }

  tile(x, y) {
    const t = this.tileSize;
    this.tctx.drawImage(this.srcCanvas, x, y, t, t, 0, 0, t, t);
    return this.tileCanvas.toDataURL(`image/${this.imgEncoding}`, this.tileQuality);
  }

  keyNext = () => {
    this.keyInstead = true;
  };

  encode() {
    if (this.srcVideo) {
      this.srcCtx.drawImage(this.srcVideo, 0, 0, this.vidW, this.vidH, 0, 0, this.w, this.h);
    }
    const data = this.srcCtx.getImageData(0, 0, this.w, this.h);
    if (this.keyInstead) {
      // -- Keyframe --
      this.rctx.putImageData(data, 0, 0);
      // prevFrameData = data;
      this.keyInstead = false;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(this.keyNext, this.keyFrameDelay);
      return this.srcCanvas.toDataURL(`image/${this.imgEncoding}`, this.keyFrameQuality);
    }
    // -- Compressed changes (not keyframe) --
    const coordMap = this.frameDiff(data, this.rctx.getImageData(0, 0, this.w, this.h));
    const tiles = new Array(this.numOfTiles);
    for (const [k, v] of coordMap) {
      if (v > this.pixelThreshold) {
        const mx = Math.floor(k / 100);
        const my = k % 100;
        tiles.push(mx);
        tiles.push(my);
        tiles.push(this.tile(this.tileSize * mx, this.tileSize * my));
      }
    }
    tiles.push(this.tileSize);
    this.decoder.decode(tiles);
    return tiles;
  }
}
