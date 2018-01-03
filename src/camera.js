import 'webrtc-adapter';
import { getCanvas } from './utils';

let video;
let stream;
let canvas;
let ctx;

// // TODO: FUTURE!:
// // run image computations in worker.
// // "Cranking up performance in graphics intensive web apps and games" on youtube
// const oc = new OffscreenCanvas(w, h);
// const snap = oc.transferToImagegBitmap();
// const ctx = viewCanvas.getContext('bitmaprenderer');
// ctx.transferFromImageBitmap(snap);

export function getFrameStr(encoding = 'jpeg', quality = 0.2) {
  ctx.drawImage(video, 0, 0, video.width, video.height);
  const frameData = canvas.toDataURL(`image/${encoding}`, quality);
  return frameData;
}
export function frameToCanvas() {
  ctx.drawImage(video, 0, 0, video.width, video.height);
}
export function getVideoElement() {
  return video;
}
export function getFrameData() {
  const w = video.width;
  const h = video.height;
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
export function getCanvasElement() {
  return canvas;
}

export function init(width = 640, height, videoEl, canvasEl) {
  let h;
  if (!height) h = Math.floor(width * 3 / 4);
  else h = height;
  video = videoEl || document.createElement('video');
  video.autoPlay = true;
  video.width = width;
  video.height = h;
  canvas = canvasEl || getCanvas(width, h, true);
  ctx = canvas.getContext('2d');
  return navigator.mediaDevices
    .getUserMedia({
      video: {
        mandatory: {
          minWidth: width / 3,
          maxWidth: width,
        },
      },
    })
    .then(videoStream => {
      stream = videoStream;
      if (window.URL) {
        video.src = window.URL.createObjectURL(videoStream);
      } else if (window.webkitURL) {
        video.src = window.webkitURL.createObjectURL(videoStream);
      } else {
        Promise.reject(new Error('Could not create URL from stream'));
      }
      console.log('mediaDevices video started');
    });
}

export function stop() {
  if (stream) {
    stream.getVideoTracks()[0].stop();
    stream = undefined;
  }
  console.log('mediaDevices video stopped');
}
