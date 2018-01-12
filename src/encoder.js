import Decoder from './decoder';
import { getCanvas } from './utils';
// import * as camera from './camera';

const version = 1;

export default class Encoder {
  tileSize = 16;
  w = 640;
  h = 480;
  numOfTiles = this.w / this.tileSize * (this.h / this.tileSize);
  keyFrameDelay = 6000;
  imgEncoding = 'jpeg';
  keyFrameQuality = 0.1;
  tileQuality = 0.25;
  grayscale = false;
  diffThreshold = 20;
  pixelThreshold = 0.04 * this.tileSize * this.tileSize * (this.grayscale ? 1 : 3);

  resultCanvas;
  rctx;
  tileCanvas;
  tctx;

  timer;
  keyInstead = true;
  decoder;
  lastKeySize;

  constructor(codecParams, rCanvas, rContext) {
    // if (!src) throw new Error('Insufficient argument');
    if (codecParams) {
      if (codecParams.keyFrameQuality) this.keyFrameQuality = codecParams.keyFrameQuality;
      if (codecParams.tileQuality) this.tileQuality = codecParams.tileQuality;
      if (codecParams.imgEncoding) this.imgEncoding = codecParams.imgEncoding;
      if (codecParams.keyFrameDelay) this.keyFrameDelay = codecParams.keyFrameDelay;
      if (codecParams.tileSize) this.tileSize = codecParams.tileSize;
      if (codecParams.grayscale) this.grayscale = codecParams.grayscale;
      if (codecParams.tilePercentThreshold) {
        this.pixelThreshold =
          codecParams.tilePercentThreshold *
          this.tileSize *
          this.tileSize *
          (this.grayscale ? 1 : 3);
      }
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
    this.tileCanvas = getCanvas(this.tileSize * this.numOfTiles, this.tileSize, true);
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
        let delta;
        if (!this.grayscale) {
          delta =
            Math.abs(d[i] - e[i]) + Math.abs(d[i + 1] - e[i + 1]) + Math.abs(d[i + 2] - e[i + 2]);
        } else {
          const a1 = 0.2 * d[i] + 0.7 * d[i + 1] + 0.1 * d[i + 2];
          const a2 = 0.2 * e[i] + 0.7 * e[i + 1] + 0.1 * e[i + 2];
          delta = Math.abs(a1 - a2);
        }
        if (delta > this.diffThreshold) {
          // d[i] = 255;
          const tx = Math.floor(x / this.tileSize);
          const ty = Math.floor(y / this.tileSize);
          const k = tx * 1000 + ty;
          if (!coordMap.has(k)) coordMap.set(k, 1);
          else coordMap.set(k, coordMap.get(k) + 1);
        }
      }
    }
    const tileIds = [];
    for (const [k, v] of coordMap) {
      if (v > this.pixelThreshold) tileIds.push(k);
    }
    return tileIds;
  }

  // tileStr(x, y, srcCanvas) {
  //   const t = this.tileSize;
  //   this.tctx.drawImage(srcCanvas, x, y, t, t, 0, 0, t, t);
  //   return this.tileCanvas.toDataURL(`image/${this.imgEncoding}`, this.tileQuality);
  // }

  keyNext = () => {
    this.keyInstead = true;
  };

  getKeyframe(srcCanvas, data) {
    // -- Keyframe --
    this.rctx.putImageData(data, 0, 0);
    // prevFrameData = data;
    this.keyInstead = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(this.keyNext, this.keyFrameDelay);
    const str = srcCanvas.toDataURL(`image/${this.imgEncoding}`, this.keyFrameQuality);
    this.lastKeySize = str.length;
    console.log(this.lastKeySize, 'KEY');
    return [version, str, 0];
  }

  encode(srcCanvas, srcCtx) {
    // if (!srcCanvas) {
    //   this.srcCtx.drawImage(this.srcVideo, 0, 0, this.vidW, this.vidH, 0, 0, this.w, this.h);
    // }
    const data = srcCtx.getImageData(0, 0, this.w, this.h);
    if (this.keyInstead) return this.getKeyframe(srcCanvas, data);
    // -- Compressed changes (not keyframe) --
    const tileIds = this.frameDiff(data, this.rctx.getImageData(0, 0, this.w, this.h));
    const len = tileIds.length;
    if (len > this.numOfTiles * 0.2) return this.getKeyframe(srcCanvas, data);
    // console.log(coordMap);
    const t = this.tileSize;
    const payload = [version, undefined, t, 0];
    const tileCanvas = getCanvas(t * len, t, true);
    const tctx = tileCanvas.getContext('2d');
    for (let i = 0; i < len; i += 1) {
      const id = tileIds[i];
      const tx = Math.floor(id / 1000);
      const ty = id % 1000;
      payload.push(id);
      // console.log('encode tile', t * tx, t * ty, t, t, t * i, 0, t, t);
      tctx.drawImage(srcCanvas, t * tx, t * ty, t, t, t * i, 0, t, t);
    }
    payload[1] = tileCanvas.toDataURL(`image/${this.imgEncoding}`, this.tileQuality);
    // payload.push(this.tileSize);
    this.decoder.decode(payload);
    return payload;
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    // camera.stop();
  }
}
