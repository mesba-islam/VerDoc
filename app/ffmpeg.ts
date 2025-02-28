import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { useFileStore } from '@/app/store';

let ffmpegInstance: FFmpeg | null = null;

const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

    // Add event listeners
    ffmpegInstance.on('log', ({ message }) => {
      console.log('[FFmpeg log]', message);
    });

    ffmpegInstance.on('progress', ({ progress }) => {
      const percentage = Math.round(progress * 100);
      useFileStore.getState().setConversionProgress(percentage);
    });

    // Load FFmpeg core
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }
  return ffmpegInstance;
};

export const convertVideoToAudio = async (file: File): Promise<Blob> => {
  const ffmpeg = await loadFFmpeg();
  const fileExtension = file.name.split('.').pop() || 'mp4';
  const inputFileName = `input.${fileExtension}`;
  const outputFileName = `output-${Date.now()}.mp3`;

  try {
    // Reset store states
    useFileStore.getState().setError(null);
    useFileStore.getState().setIsConverting(true);
    useFileStore.getState().setConversionProgress(0);

    // Write input file to FFmpeg
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // Execute conversion command
    await ffmpeg.exec([
      '-i', inputFileName,
      '-vn',              // Disable video
      '-acodec', 'libmp3lame', // MP3 codec
      '-q:a', '2',        // Audio quality (0-9, 0=best)
      '-y',               // Overwrite output
      outputFileName
    ]);

    // Read output file
    const outputData = await ffmpeg.readFile(outputFileName);

    // Cleanup files
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    return new Blob([outputData], { type: 'audio/mpeg' });
  } catch (error) {
    console.error('Conversion error:', error);
    useFileStore.getState().setError('Conversion failed. Please try again.');
    throw error;
  } finally {
    useFileStore.getState().setIsConverting(false);
  }
};