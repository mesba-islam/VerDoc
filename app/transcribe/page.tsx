"use client";

import { useEffect, useState, useRef } from "react"; // Add missing hooks
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Download } from "lucide-react";
import DropzoneComponent from "@/app/components/Dropzone";
import { useFileStore } from "@/app/store";
import { convertVideoToAudio } from "@/app/ffmpeg";

export default function TranscribePage() {
  const {
    file,
    audioBlob,
    isConverting,
    conversionProgress,
    error,
    setAudioBlob,
    setIsConverting,
    setError
  } = useFileStore();

  useEffect(() => {
    const handleConversion = async () => {
      if (file && !audioBlob && !isConverting) {
        try {
          setIsConverting(true);
          setError(null);
          const convertedBlob = await convertVideoToAudio(file);
          setAudioBlob(convertedBlob);
        } catch (err) {
          console.error('Conversion error:', err);
          setError('Conversion failed. Please try again.');
        } finally {
          setIsConverting(false);
        }
      }
    };

    handleConversion();
  }, [file, audioBlob, isConverting]);

  return (
    <div className="flex flex-col items-center gap-6 mt-10">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
        Upload Your Video
      </h1>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-red-500 p-4 bg-red-50 rounded-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <DropzoneComponent />

      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-2xl p-6 bg-dark/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-100"
          >
            <div className="flex flex-col items-center gap-5">
              <motion.div
                className="w-full flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-gray-700 font-medium truncate">
                  {file.name}
                </span>
                {isConverting && (
                  <span className="text-sm text-cyan-600">
                    {conversionProgress}%
                  </span>
                )}
              </motion.div>

              {isConverting && (
                <motion.div
                  className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                    style={{ width: `${conversionProgress}%` }}
                  />
                </motion.div>
              )}

              {audioBlob && (
                <motion.div
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AudioPlayer audioBlob={audioBlob} />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AudioPlayer = ({ audioBlob }: { audioBlob: Blob }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-xl filter blur-2xl group-hover:blur-3xl transition-all duration-300" />
      
      <div className="relative flex items-center justify-between p-4 bg-dark rounded-xl shadow-lg border border-gray-100">
        <button
          onClick={togglePlayback}
          className="p-3 rounded-full bg-cyan-500 hover:bg-cyan-600 transition-colors shadow-md"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </button>

        <div className=" mx-4">
          <WaveformVisualizer isPlaying={isPlaying} />
        </div>

        <a
          href={URL.createObjectURL(audioBlob)}
          download="converted-audio.mp3"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Download className="w-6 h-6 text-cyan-600" />
        </a>

        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        >
          <source src={URL.createObjectURL(audioBlob)} type="audio/mpeg" />
        </audio>
      </div>
    </div>
  );
};

const WaveformVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  return (
    <div className="flex items-end h-12 gap-1">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="w-2 bg-cyan-400 rounded-full"
          animate={{
            height: isPlaying ? `${Math.random() * 24 + 8}px` : "8px",
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
          style={{ originY: "bottom" }}
        />
      ))}
    </div>
  );
};