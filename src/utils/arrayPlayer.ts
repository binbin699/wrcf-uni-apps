// 使用了web api，不适用于小程序环境与app环境
export type ArrayPlayerOptions = {
  loop?: boolean;
};

export const DEFAULT_ARRAY_PLAYER_OPTIONS = {
  loop: true
};

/**
 * 数组缓冲区播放器
 *
 * e.g.
 * const arrayPlayer = new ArrayBufferPlayer();
 * arrayPlayer.load(audioBuffer);
 * arrayPlayer.updateOptions({ loop: false });
 * arrayPlayer.toggle();
 */
export class ArrayBufferPlayer {
  private audioContext: AudioContext;
  private audioSource: AudioBufferSourceNode;
  private _curArrayBuffer: ArrayBuffer | null = null;
  private _isPlaying: boolean = false;

  constructor(options: ArrayPlayerOptions = {}) {
    this.audioContext = new AudioContext();
    this.audioSource = this.audioContext.createBufferSource();
    this.updateOptions(options);
  }

  updateOptions(options: ArrayPlayerOptions): void {
    this.audioSource.loop = options.loop || false;
  }

  load(arrayBuffer: ArrayBuffer): void {
    this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
      this.audioSource.buffer = buffer;
      this.audioSource.connect(this.audioContext.destination);
    });
    this._curArrayBuffer = arrayBuffer;
    console.log('ArrayBufferPlayer: load buffer');
  }

  /**
   * 切换音频缓冲区播放状态
   */
  toggle(): void {
    if (this._isPlaying) {
      console.log('ArrayBufferPlayer: stop');
      this.audioSource.stop();
    } else {
      console.log('ArrayBufferPlayer: start');
      this.audioSource.start();
    }
    this._isPlaying = !this._isPlaying;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get curArrayBuffer(): ArrayBuffer | null {
    return this._curArrayBuffer;
  }
}
