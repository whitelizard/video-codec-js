import Decoder from './decoder';
import { getCanvas } from './utils';
// import * as camera from './camera';

export default class Encoder {
  tileSize = 16;
  w = 640;
  h = 480;
  numOfTiles = this.w / this.tileSize * (this.h / this.tileSize);
  keyFrameDelay = 6000;
  imgEncoding = 'webp';
  keyFrameQuality = 0.1;
  tileQuality = 0.05;
  pixelThreshold = 3;
  diffThreshold = 20;

  // srcVideo;
  // srcCanvas;
  // srcCtx;
  resultCanvas;
  rctx;
  tileCanvas;
  tctx;

  // vidW;
  // vidH;
  timer;
  keyInstead = true;
  decoder;

  constructor(codecParams, rCanvas, rContext) {
    // if (!src) throw new Error('Insufficient argument');
    if (codecParams) {
      if (codecParams.keyFrameQuality) this.keyFrameQuality = codecParams.keyFrameQuality;
      if (codecParams.tileQuality) this.tileQuality = codecParams.tileQuality;
      if (codecParams.imgEncoding) this.imgEncoding = codecParams.imgEncoding;
      if (codecParams.keyFrameDelay) this.keyFrameDelay = codecParams.keyFrameDelay;
      if (codecParams.pixelThreshold) this.pixelThreshold = codecParams.pixelThreshold;
      if (codecParams.tileSize) this.tileSize = codecParams.tileSize;
      if (codecParams.diffThreshold) this.diffThreshold = codecParams.diffThreshold;
      if (codecParams.width) {
        this.w = codecParams.width;
        if (!codecParams.height) this.h = Math.floor(this.w * 3 / 4);
        else this.h = codecParams.height;
      }
      if (this.w % this.tileSize + this.h % this.tileSize > 0) {
        throw new Error('Unsupported frame or tile size');
      }
      this.numOfTiles = this.w / this.tileSize * this.h / this.tileSize;
    }
    // this.srcCanvas = canvasEl || ;
    // this.srcVideo = videoEl || ;
    // if (src instanceof HTMLVideoElement) {
    //   this.srcVideo = src;
    //   this.srcCanvas = getCanvas(this.w, this.h);
    // } else if (src instanceof HTMLCanvasElement) {
    //   this.srcCanvas = src;
    // } else {
    //   camera.init(this.w, this.h);
    //   this.srcVideo = camera.getVideoElement();
    //   this.srcCanvas = camera.getCanvasElement();
    // }
    // this.srcCtx = this.srcCanvas.getContext('2d');
    // this.vidW = src ? src.width : this.srcCanvas.width;
    // this.vidH = src ? src.height : this.srcCanvas.height;
    // throw new Error('First argument not of type HTMLCanvasElement or HTMLVideoElement');
    this.resultCanvas = rCanvas || getCanvas(this.w, this.h);
    this.rctx = rContext || this.resultCanvas.getContext('2d');
    this.tileCanvas = getCanvas(this.tileSize, this.tileSize, true);
    this.tctx = this.tileCanvas.getContext('2d');
    this.decoder = new Decoder(this.resultCanvas, this.rctx);
  }

  frameDiff(f1, f2) {
    const d = f1.data;
    const e = f2.data;
    if (d.length !== e.length) throw new Error('Frames not same size!');
    const coordMap = new Map();
    // TODO: Set instead of {}? xxyy as one number to store in the Set
    // { 403: 5, 1406: 7, 1512: 3 }
    // x > 4 => [403, 1406]
    for (let x = 0; x < this.w; x += 1) {
      for (let y = 0; y < this.h; y += 1) {
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

  tileStr(x, y, srcCanvas) {
    const t = this.tileSize;
    this.tctx.drawImage(srcCanvas, x, y, t, t, 0, 0, t, t);
    return this.tileCanvas.toDataURL(`image/${this.imgEncoding}`, this.tileQuality);
  }

  keyNext = () => {
    this.keyInstead = true;
  };

  encode(srcCanvas, srcCtx) {
    // if (!srcCanvas) {
    //   this.srcCtx.drawImage(this.srcVideo, 0, 0, this.vidW, this.vidH, 0, 0, this.w, this.h);
    // }
    const data = srcCtx.getImageData(0, 0, this.w, this.h);
    if (this.keyInstead) {
      // -- Keyframe --
      this.rctx.putImageData(data, 0, 0);
      // prevFrameData = data;
      this.keyInstead = false;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(this.keyNext, this.keyFrameDelay);
      const str = srcCanvas.toDataURL(`image/${this.imgEncoding}`, this.keyFrameQuality);
      console.log(str.length, 'KEY');
    }
    // -- Compressed changes (not keyframe) --
    const coordMap = this.frameDiff(data, this.rctx.getImageData(0, 0, this.w, this.h));
    // console.log(coordMap);
    const tiles = [];
    for (const [k, v] of coordMap) {
      if (v > this.pixelThreshold) {
        const mx = Math.floor(k / 100);
        const my = k % 100;
        tiles.push(mx);
        tiles.push(my);
        tiles.push(this.tileStr(this.tileSize * mx, this.tileSize * my, srcCanvas));
      }
    }
    tiles.push(this.tileSize);
    this.decoder.decode(tiles);
    return tiles;
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    // camera.stop();
  }
}
