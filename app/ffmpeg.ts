import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

let ffmpegInstance: any = null;

export const getFFmpeg = async () => {
  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({
      log: true,
      corePath: '/ffmpeg/ffmpeg-core.js',
    });
    if (!ffmpegInstance.isLoaded()) {
      await ffmpegInstance.load();
    }
  }
  return ffmpegInstance;
};