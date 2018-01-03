import { Component } from 'preact';
import './style.css';
import * as camera from '../src/camera';
import Encoder from '../src/encoder';
// import Decoder from './streaming/decode';

// function
//
// export function setCanvas(c) {
//   console.log('setCanvas', c);
//   frameCanvas = c;
// }
//
// export function getCanvas() {
//   console.log('getCanvas', frameCanvas);
//   return frameCanvas;
// }

// encoder = new Encoder({
//   // w: 640,
//   // h: 480,
//   // tileSize: 40,
//   tileQuality: 0.7,
//   keyFrameQuality: 0.5,
//   diffThreshold: 10,
//   // pixelThreshold: 2,
// });

export default class App extends Component {
  videoEl;
  encoder;
  decoder;
  canvas1;
  ctx1;
  canvas2;
  timer;
  state = { ticks: 0 };
  tick = () => {
    // console.log('tick!', this.encoder);
    if (!this.encoder) return;
    camera.frameToCanvas();
    const data = this.encoder.encode(this.canvas1, this.ctx1);
    const json = JSON.stringify(data);
    console.log(json.length);
    this.setState({ ticks: this.state.ticks + 1 });
    // decoder.decode(data);
  };
  stop() {
    clearInterval(this.timer);
    camera.stop();
  }
  constructor(props) {
    super(props);
    this.fps = 5;
    this.frameDelay = 1000 / this.fps;
  }
  componentDidMount() {
    // this.canvas1.width = this.videoEl.width;
    // this.canvas2.width = this.videoEl.width;
    // this.canvas1.height = this.videoEl.height;
    // this.canvas2.height = this.videoEl.height;
    this.ctx1 = this.canvas1.getContext('2d');
    camera.init(undefined, undefined, undefined, this.canvas1).then(() => {
      // console.log(this);
      this.encoder = new Encoder({}, this.canvas2);
      // this.decoder = new Decoder(this.canvas2);
      this.timer = setInterval(this.tick, this.frameDelay);
      // console.log('camera initiated', this.videoEl.autoPlay);
    });
  }
  render({}, { ticks }) {
    return (
      <div>
        {/* <video ref={c => (this.videoEl = c)} width="640" height="480" /> */}
        <canvas ref={c => (this.canvas1 = c)} width="640" height="480" />
        <canvas ref={c => (this.canvas2 = c)} width="640" height="480" />
        {ticks}
      </div>
    );
  }
}
