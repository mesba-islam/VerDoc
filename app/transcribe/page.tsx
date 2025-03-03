"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Download, Loader2 } from "lucide-react";
import DropzoneComponent from "@/app/components/Dropzone";
import { useFileStore } from "@/app/store";
import { convertVideoToAudio } from "@/app/ffmpeg";
import SummaryGenerator from '@/app/components/SummaryGenerator';
import { ErrorBoundary } from 'react-error-boundary';


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

        <div className="mx-4">
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


export default function TranscribePage() {
  const {
    file,
    audioBlob,
    transcript,
    isConverting,
    isTranscribing,
    conversionProgress,
    error,
    segments,
    setAudioBlob,
    setTranscript,
    setIsConverting,
    setIsTranscribing,
    setError,
    setSegments,
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


   // Type for grouped segments
   type GroupedSegment = {
    text: string;
    pauseDuration: number;
  };

  const groupSegmentsWithPauses = (): GroupedSegment[] => {
    if (!segments) return [];
    
    const grouped: GroupedSegment[] = [];
    let currentGroup: string[] = [];
    let lastEnd = 0;

    segments.forEach((segment, index) => {
      if (segment.start - lastEnd > 1 && index !== 0) {
        grouped.push({
          text: currentGroup.join(' '),
          pauseDuration: segment.start - lastEnd
        });
        currentGroup = [];
      }
      currentGroup.push(segment.text);
      lastEnd = segment.end;
    });

    if (currentGroup.length > 0) {
      grouped.push({ text: currentGroup.join(' '), pauseDuration: 0 });
    }

    return grouped;
  };

  const handleTranscription = async () => {
    if (!audioBlob) return;

    try {
      setIsTranscribing(true);
      setError(null);
      
      const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const { segments, text } = await response.json();
      setSegments(segments); // Now properly used
      setTranscript(text);
    } catch (err) {
      const error = err as Error;
      console.error('Transcription error:', error);
      setError(error.message || 'Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

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
                  
                  {!transcript && (
                    <motion.button
                      onClick={handleTranscription}
                      disabled={isTranscribing}
                      className="mt-4 w-full py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isTranscribing ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        "Transcribe Audio"
                      )}
                    </motion.button>
                  )}
                </motion.div>
              )}

            {transcript && (
              <motion.div
                className="w-full mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="p-4 bg-dark-50 rounded-lg">
                  <h3 className="text-2xl font-semibold mb-4">Transcription</h3>
                  <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2"> {/* Added fixed height and scroll */}
                    {groupSegmentsWithPauses().map((group, index) => (
                      <div key={index} className="relative">
                        <p className="text-light-600 text-sm mb-2 whitespace-pre-wrap">
                          {group.text}
                        </p>
                        {group.pauseDuration > 0 && (
                          <div className="flex items-center gap-2 mt-4 text-xs text-cyan-500">
                            <span>⏸</span>
                            <span className="h-px bg-cyan-500/20 flex-1"></span>
                            <span>{group.pauseDuration.toFixed(1)}s pause</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

              <ErrorBoundary 
                FallbackComponent={({ error }) => (
                  <div className="error-message">
                    Summary Generation Error: {error.message}
                  </div>
                )}
              >
                <SummaryGenerator transcript={transcript} />
              </ErrorBoundary>

                </div>
              </motion.div>
            )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

