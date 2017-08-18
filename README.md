# video-codec-js
Javascript video codec for the browser.

Encodes from a video or canvas element into either a string (key frame) or an array (tiles). These can then be put in your favorite protocol and sent over a Websocket for instance, for real-time video streaming.

```javascript
import Encoder from 'video-codec-js/lib/encoder';

const encoder = new Encoder(videoElement, {
  // These are the defaults, no need to pass them if not modified:
  tileQuality: 0.25,
  keyFrameQuality: 0.4,
  diffThreshold: 20,
  pixelThreshold: 3,
  imgEncoding: 'webp',
  keyFrameDelay: 6000,
  width: 320,
  height: 240,
  tileSize: 20,
});
const data = encoder.encode();
```

```javascript
import Decoder from 'video-codec-js/lib/decoder';

const decoder = new Decoder(canvasElement);
decoder.decode(data);
```
