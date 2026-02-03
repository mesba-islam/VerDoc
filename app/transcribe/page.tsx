"use client";
import { generateTitleFromSummary } from '@/app/lib/summaryUtils';
import { useEffect, useState, useRef, useCallback } from "react";
import type { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Download, Loader2, CheckCircle, Copy } from "lucide-react";
import DropzoneComponent from "@/app/components/Dropzone";
import { useFileStore } from "@/app/store";
import { convertVideoToAudio } from "@/app/ffmpeg";
import SummaryGenerator from '@/app/components/SummaryGenerator';
import { ErrorBoundary } from 'react-error-boundary';
import { generateSummaryPDF } from '@/app/generatePdf';
import useUser from '@/app/hook/useUser';
import { cn } from "@/lib/utils";

type LimitResponse = {
  canTranscribe: boolean;
  message: string;
  remainingMinutes: number;
};

type ValidateResponse = {
  canProceed: boolean;
  error?: string;
  suggestion?: string;
  warning?: string;
  remainingAfterUse?: number;
};

type RecordResponse = {
  success: boolean;
  updatedLimits: {
    canTranscribe: boolean;
    message: string;
    remainingMinutes: number;
    billingInterval: string | null;
  };
};

type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
};

type AudioPlayerProps = {
  audioBlob: Blob;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onPlayStateChange: (isPlaying: boolean) => void;
  onTimeUpdate?: (currentTime: number) => void;
};

const AudioPlayer = ({ audioBlob, audioRef, isPlaying, onPlayStateChange, onTimeUpdate }: AudioPlayerProps) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    onPlayStateChange(false);
    return () => {
      URL.revokeObjectURL(url);
      setAudioUrl(null);
    };
  }, [audioBlob, onPlayStateChange]);

  const togglePlayback = () => {
    const element = audioRef.current;
    if (!element) return;

    if (isPlaying) {
      element.pause();
      onPlayStateChange(false);
    } else {
      const playPromise = element.play();
      if (playPromise) {
        void playPromise.then(() => onPlayStateChange(true)).catch(() => undefined);
      } else {
        onPlayStateChange(true);
      }
    }
  };

  return (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-xl filter blur-2xl group-hover:blur-3xl transition-all duration-300" />
      <div className="relative flex items-center justify-between p-4 bg-dark rounded-xl shadow-lg border border-gray-100">
        <button onClick={togglePlayback} className="p-3 rounded-full bg-cyan-500 hover:bg-cyan-600 transition-colors shadow-md" aria-label={isPlaying ? "Pause audio" : "Play audio"}>
          {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
        </button>
        <div className="mx-4">
          <WaveformVisualizer isPlaying={isPlaying} />
        </div>
        {audioUrl ? (
          <>
            <a
              href={audioUrl}
              download="converted-audio.mp3"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Download className="w-6 h-6 text-cyan-600" />
            </a>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => onPlayStateChange(false)}
              onPause={() => onPlayStateChange(false)}
              onPlay={() => onPlayStateChange(true)}
              onTimeUpdate={(event) => onTimeUpdate?.(event.currentTarget.currentTime)}
              className="hidden"
            />
          </>
        ) : (
          <div className="p-2 rounded-lg text-sm text-slate-400">Preparing audio...</div>
        )}
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
          animate={{ height: isPlaying ? `${Math.random() * 24 + 8}px` : "8px" }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          style={{ originY: "bottom" }}
        />
      ))}
    </div>
  );
};

function parseAudioDuration(durationString: string): number {
  const [m = '0', s = '0'] = durationString.split(':');
  return (parseInt(m) || 0) + (parseInt(s) || 0) / 60;
}

const formatTimestamp = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return "0:00";
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function TranscribePage() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [transcriptionLimit, setTranscriptionLimit] = useState<LimitResponse>({
    canTranscribe: false,
    message: 'Loading subscription...',
    remainingMinutes: 0
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [duration, setDuration] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [hasGeneratedSummary, setHasGeneratedSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isCustomPanelOpen, setIsCustomPanelOpen] = useState(false);

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
    setFile,
  } = useFileStore();
  const transcriptSegments = segments ?? [];

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
  }, [file, audioBlob, isConverting, setIsConverting, setError, setAudioBlob]);

  useEffect(() => {
    if (audioBlob) {
      const getDuration = async () => {
        const durationString = await formatAudioDuration(audioBlob);
        setDuration(durationString);
      };
      getDuration();
    }
  }, [audioBlob]);

  // Load limits from the SERVER (cookie session = source of truth)
  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch('/api/transcription/limits', { credentials: 'include' });
        if (!res.ok) throw new Error(`limits: ${res.status}`);
        const data: LimitResponse = await res.json();
        setTranscriptionLimit(data);
      } catch (e) {
        console.error('Error checking subscription limits:', e);
        setTranscriptionLimit({
          canTranscribe: false,
          message: 'Error checking subscription limits',
          remainingMinutes: 0
        });
      }
    };
    run();
  }, [user]);

  useEffect(() => {
    segmentRefs.current = [];
    if (segments && segments.length > 0) {
      setActiveSegmentIndex(0);
    } else {
      setActiveSegmentIndex(null);
    }
  }, [segments]);

  const handleTranscription = async () => {
    if (!audioBlob || !user?.id || !duration) return;

    try {
      console.log("=== Starting transcription validation (server) ===");
      const audioDurationMinutes = parseAudioDuration(duration);

      // Validate on SERVER
      const vRes = await fetch('/api/transcription/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: audioDurationMinutes }),
      });
      if (!vRes.ok) {
        if (vRes.status === 401) {
          setError('Please sign in to transcribe.');
          return;
        }
        const err = await vRes.json().catch(() => ({}));
        setError(err.error || 'Validation failed');
        return;
      }
      const validation: ValidateResponse = await vRes.json();

      if (!validation.canProceed) {
        setError(`${validation.error ?? 'Cannot proceed'}${validation.suggestion ? `\n\n${validation.suggestion}` : ''}`);
        return;
      }

      if (validation.warning) {
        const userConfirmed = window.confirm(
          `${validation.warning}\n\nAfter this transcription, you'll have ${validation.remainingAfterUse?.toFixed(1)} minutes left.\n\nDo you want to continue?`
        );
        if (!userConfirmed) return;
      }

      setIsTranscribing(true);
      setError(null);

      // Upload for transcription
      const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });
      const formData = new FormData();
      formData.append("file", audioFile);

      const transcribeResponse = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!transcribeResponse.ok) {
        let errorMessage = 'Transcription failed';
        try {
          const errorData = await transcribeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (transcribeResponse.status === 500) errorMessage = 'Connection error. Please check your internet and try again.';
          else if (transcribeResponse.status === 413) errorMessage = 'File too large. Please use a smaller audio file.';
          else if (transcribeResponse.status === 400) errorMessage = 'Invalid file format. Please use MP3, WAV, or M4A.';
        }
        throw new Error(errorMessage);
      }

      const responseData = await transcribeResponse.json();
      console.log("Transcription successful");

      // Record usage on SERVER
      try {
        const rRes = await fetch('/api/transcription/record', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes: audioDurationMinutes }),
        });
        if (rRes.ok) {
          const usageResult: RecordResponse = await rRes.json();
          setTranscriptionLimit({
            canTranscribe: usageResult.updatedLimits.canTranscribe,
            message: usageResult.updatedLimits.message,
            remainingMinutes: usageResult.updatedLimits.remainingMinutes
          });
          if (usageResult.updatedLimits.remainingMinutes === 0) {
            setError(`Transcription completed! You've used all your transcription minutes for this ${usageResult.updatedLimits.billingInterval || 'billing period'}.`);
          }
        } else {
          console.error('Record usage failed:', rRes.status);
          setError('Transcription completed, but there was an issue recording usage. Please contact support.');
        }
      } catch (usageError) {
        console.error('Error recording usage:', usageError);
        setError('Transcription completed, but there was an issue recording usage. Please contact support.');
      }

      // Display results
      setSegments(responseData.segments);
      setTranscript(responseData.text);
    } catch (err) {
      const error = err as Error;
      console.error('Transcription error:', error);
      let userFriendlyMessage = error.message;
      if (error.message.includes('Connection error')) userFriendlyMessage = 'Network connection failed. Please check your internet and try again.';
      else if (error.message.includes('timeout')) userFriendlyMessage = 'Request timed out. Please try with a shorter audio file.';
      else if (error.message.includes('API key')) userFriendlyMessage = 'Service temporarily unavailable. Please try again later.';
      setError(userFriendlyMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTimeUpdate = useCallback((currentTime: number) => {
    if (!segments || segments.length === 0) return;
    const nextIndex = segments.findIndex(
      (segment) => currentTime >= segment.start && currentTime < segment.end,
    );

    if (nextIndex === -1) {
      if (
        segments.length > 0 &&
        currentTime >= segments[segments.length - 1].end &&
        activeSegmentIndex !== segments.length - 1
      ) {
        setActiveSegmentIndex(segments.length - 1);
        const finalNode = segmentRefs.current[segments.length - 1];
        if (finalNode) {
          finalNode.scrollIntoView({ block: "nearest" });
        }
      }
      return;
    }

    if (nextIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(nextIndex);
      const targetNode = segmentRefs.current[nextIndex];
      if (targetNode) {
        targetNode.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [segments, activeSegmentIndex]);

  const handleSegmentSelect = useCallback((segment: TranscriptSegment, index: number) => {
    const node = segmentRefs.current[index];
    if (node) {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    setActiveSegmentIndex(index);
    const element = audioRef.current;
    if (!element) return;

    element.currentTime = Math.max(segment.start - 0.05, 0);
    const playPromise = element.play();
    if (playPromise) {
      void playPromise.then(() => setIsPlaying(true)).catch(() => undefined);
    } else {
      setIsPlaying(true);
    }
  }, [setIsPlaying, audioRef]);

  const formatAudioDuration = (audioBlob: Blob) => {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    return new Promise<string>((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        URL.revokeObjectURL(url);
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      });
    });
  };

  const handleCopyContent = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadPDF = () => {
    if (!summary) return;
    const { title, content } = generateTitleFromSummary(summary);
    const dateString = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    generateSummaryPDF(title, content, dateString);
  };

  const handleReset = () => {
    setFile(null);
    setDuration(null);
    setError(null);
    setAudioBlob(null);
    setTranscript(null);
    setSegments(null);
    setSummary('');
    setIsPlaying(false);
    setActiveSegmentIndex(null);
    segmentRefs.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  if (isUserLoading) return <div>Loading...</div>;

  return (
    <div className="relative min-h-screen overflow-hidden ">
      {/* Background blobs */}
      <motion.div
        className="pointer-events-none absolute -left-28 top-10 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(77,208,225,0.22),rgba(21,41,78,0.12),transparent_60%)] blur-3xl"
        animate={{ x: [0, 50, -30, 20, 0], y: [0, 40, 10, -20, 0], scale: [1, 1.06, 0.95, 1.04, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-15%] top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(122,229,130,0.2),rgba(55,108,166,0.14),transparent_60%)] blur-3xl"
        animate={{ x: [0, -40, 30, -15, 0], y: [0, -25, 35, -18, 0], scale: [1, 0.94, 1.08, 0.98, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/3 bottom-0 h-72 w-72 rotate-12 bg-gradient-to-r from-cyan-400/15 via-blue-500/12 to-teal-400/15 blur-[90px]"
        animate={{ scale: [1, 1.08, 0.96, 1.05, 1], rotate: [8, 12, 6, 10, 8] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container relative z-10 mx-auto max-w-4xl px-4 py-10">
      {/* Summary Modal */}
      <AnimatePresence>
        {isSummaryModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl"
            >
              <div className="relative flex max-h-[90vh] rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl dark:border-white/10 dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-950/90">
                <motion.div
                  className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(77,208,225,0.25),rgba(21,41,78,0.08),transparent_60%)] blur-3xl dark:bg-[radial-gradient(circle_at_30%_30%,rgba(77,208,225,0.3),rgba(21,41,78,0.12),transparent_60%)]"
                  animate={{ x: [0, 40, -20, 10, 0], y: [0, 20, 10, -10, 0], scale: [1, 1.03, 0.98, 1.02, 1] }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_70%_70%,rgba(122,229,130,0.18),rgba(55,108,166,0.14),transparent_60%)] blur-3xl"
                  animate={{ x: [0, -30, 30, -10, 0], y: [0, -15, 25, -10, 0], scale: [1, 0.96, 1.05, 0.99, 1] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
                  {hasGeneratedSummary && (
                    <>
                      <div className="group relative">
                        <button
                          onClick={handleCopyContent}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/80 dark:text-foreground/80 dark:hover:bg-slate-800 dark:hover:text-foreground ${summary ? '' : 'cursor-not-allowed text-gray-400'}`}
                          disabled={!summary}
                        >
                          {isCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          <span className="sr-only">Copy summary</span>
                        </button>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-gray-100 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                          Copy Content
                        </span>
                      </div>

                      <div className="group relative">
                        <button
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/80 dark:text-foreground/80 dark:hover:bg-slate-800 dark:hover:text-foreground ${summary ? '' : 'cursor-not-allowed text-gray-400'}`}
                          onClick={handleDownloadPDF}
                          disabled={!summary}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-gray-100 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                          {summary ? 'Download PDF' : 'Generate summary first'}
                        </span>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setHasGeneratedSummary(false);
                      setIsSummaryModalOpen(false);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xl transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/20 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                    aria-label="Close summary modal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <AnimatePresence>
                {isTranscribing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[45] bg-background/85 backdrop-blur-sm flex items-center justify-center">
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                      className="flex items-center gap-3 text-muted-foreground bg-card px-6 py-4 rounded-lg shadow-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
                      </div>
                      <span className="text-sm font-medium">Generating summary...</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                className={`relative w-full p-8 bg-transparent ${hasGeneratedSummary || isCustomPanelOpen ? 'max-h-[80vh] overflow-y-auto' : 'overflow-hidden'}`}
              >
                <ErrorBoundary
                  FallbackComponent={({ error }) => (
                    <div className="text-destructive bg-destructive/10 text-sm p-3 rounded-lg">
                      Error: {error.message}
                    </div>
                  )}
                >
                  <SummaryGenerator
                    transcript={transcript || ''}
                    summary={summary}
                    onSummaryGenerated={() => setHasGeneratedSummary(true)}
                    setSummary={setSummary}
                    onCustomOpenChange={setIsCustomPanelOpen}
                  />
                </ErrorBoundary>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!file ? (
        <motion.div
          className="flex flex-col items-center gap-8 p-8 bg-gradient-to-b from-dark to-gray-50 rounded-2xl shadow-sm "
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Ready to use Doc in minutes
          </h1>
          <p className="text-gray-400 text-center max-w-md">
            Upload your video or audio file to transcribe and summarize its content
          </p>

          <div className="w-full max-w-2xl">
            <div className="flex justify-center">
              <DropzoneComponent />
            </div>
            
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="w-full text-red-500 p-4 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      ) : (
        <motion.div
          layout
          className="w-full rounded-2xl overflow-hidden bg-dark border border-gradient-to-r from-cyan-500 to-blue-600 shadow-md"
        >
          <div className="bg-gradient-to-r from-cyan-500 to-dark-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <span className="font-medium truncate max-w-xs">{file.name}</span>
                {duration && <span className="text-sm opacity-90">({duration} min)</span>}
              </div>
              <button
                onClick={handleReset}
                className="text-xs bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 text-black dark:text-white rounded-full px-3 py-1 transition-colors"
              >
                New Upload
              </button>
            </div>
          </div>

          <div className="p-6">
            <AnimatePresence>
              {isConverting && (
                <motion.div className="mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Converting to audio...</span>
                    <span className="text-sm font-medium text-cyan-600">{conversionProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 to-dark-500"
                      style={{ width: `${conversionProgress}%` }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${conversionProgress}%` }}
                      transition={{ type: "spring", damping: 25 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {audioBlob && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-blend-darken-50 rounded-xl">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Audio</h3>
                  <AudioPlayer
                    audioBlob={audioBlob}
                    audioRef={audioRef}
                    isPlaying={isPlaying}
                    onPlayStateChange={setIsPlaying}
                    onTimeUpdate={handleTimeUpdate}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {audioBlob && !transcript && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                  {duration && transcriptionLimit.remainingMinutes > 0 && (
                    <div className="mb-9 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-300">Audio Duration: {duration}</span>
                        <span className="text-blue-700 dark:text-blue-300">
                          Remaining: {transcriptionLimit.remainingMinutes.toFixed(1)} minutes
                        </span>
                      </div>
                      {duration && (() => {
                        const audioDuration = parseAudioDuration(duration);
                        const denom = Math.max(1e-6, transcriptionLimit.remainingMinutes);
                        const usagePercentage = (audioDuration / denom) * 100;
                        if (transcriptionLimit.remainingMinutes > 0 && usagePercentage > 80) {
                          return (
                            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                              Warning: This will use {usagePercentage.toFixed(0)}% of your remaining minutes
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <button
                    onClick={handleTranscription}
                    disabled={
                      isTranscribing ||
                      !transcriptionLimit.canTranscribe ||
                      (!!duration && parseAudioDuration(duration) > transcriptionLimit.remainingMinutes)
                    }
                    className="w-lg py-3 px-6 
                    bg-gradient-to-r from-cyan-400 to-gray-900 
                    dark:from-cyan-500 dark:to-gray-800
                    hover:from-cyan-300 hover:to-gray-700 
                    dark:hover:from-cyan-600 dark:hover:to-gray-900
                    text-white rounded-lg font-semibold 
                    transition-all duration-300 ease-in-out shadow-lg 
                    hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 mx-auto"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Transcribing Audio...</span>
                      </>
                    ) : !transcriptionLimit.canTranscribe ? (
                      <span>{transcriptionLimit.message}</span>
                    ) : duration && parseAudioDuration(duration) > transcriptionLimit.remainingMinutes ? (
                      <span>Audio too long for remaining minutes</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8571428571428571"
                          strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-captions">
                          <rect width="18" height="14" x="3" y="5" rx="2" ry="2" />
                          <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
                        </svg>
                        <span>Transcribe Audio </span>
                      </>
                    )}
                  </button>

                  {duration && transcriptionLimit.canTranscribe && parseAudioDuration(duration) > transcriptionLimit.remainingMinutes && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <div className="text-sm text-red-700 dark:text-red-300">
                        <p className="font-medium">Audio too long for your remaining minutes</p>
                        <p className="mt-1">
                          Your audio is {parseAudioDuration(duration).toFixed(1)} minutes, but you only have {transcriptionLimit.remainingMinutes.toFixed(1)} minutes remaining.
                        </p>
                        <p className="mt-2 text-xs">Tip: Try uploading a shorter audio file or upgrade your plan for more minutes.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {transcript && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                  <div className="border-b border-gray-200 pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-white-500">Transcript</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto pr-2 mb-6 scrollbar-thin scrollbar-thumb-cyan-500/40 scrollbar-track-transparent">
                    {transcriptSegments.length > 0 ? (
                      transcriptSegments.map((segment, index) => {
                        const isActive = index === activeSegmentIndex;
                        return (
                          <button
                            key={`${segment.start}-${index}`}
                            type="button"
                            ref={(element) => { segmentRefs.current[index] = element; }}
                            onClick={() => handleSegmentSelect(segment, index)}
                            aria-pressed={isActive}
                            className={cn(
                              "w-full flex items-start gap-4 rounded-lg px-3 py-2 text-left transition-colors duration-150 border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                              isActive ? "bg-cyan-500/20 border-cyan-500/40 shadow-inner" : "hover:bg-white/5",
                            )}
                          >
                            <span
                            className={cn(
                              "min-w-[3.5rem] text-xs font-semibold px-2 py-1 rounded-md tracking-wide bg-slate-800 text-cyan-100 dark:text-cyan-200",
                              isActive && "bg-cyan-400 text-slate-900",
                            )}
                          >
                            {formatTimestamp(segment.start)}
                          </span>
                            <span
                              className={cn(
                                "text-sm leading-6 text-slate-700 dark:text-slate-100/90",
                                isActive ? "font-medium text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-100/90",
                              )}
                            >
                              {segment.text.trim()}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-300/70">
                        Transcript ready, but timestamps are unavailable for this file.
                      </p>
                    )}
                  </div>

                  <div className="relative group w-fit mx-auto">
                    <button
                      onClick={() => setIsSummaryModalOpen(true)}
                      className="group relative px-8 py-3.5 overflow-hidden rounded-xl border-2 border-cyan-500/30 hover:border-cyan-400 transition-all duration-300"
                    >
                      <div className="absolute inset-0 -z-10">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-700/90 via-cyan-800 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-x-0 group-hover:scale-x-100 origin-left" />
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 group-hover:text-white transition-colors">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                          <path d="M10 9H8" />
                        </svg>
                        <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent group-hover:bg-none group-hover:text-white transition-all font-medium">
                          Generate Summary
                        </span>
                      </div>
                      <div className="absolute inset-0 rounded-xl -z-20 opacity-0 group-hover:opacity-50 blur-[1px] group-hover:blur-[2px] transition-all duration-300 bg-gradient-to-r from-cyan-400/30 to-cyan-600/30" />
                    </button>
                    <div className="absolute inset-0 rounded-xl pointer-events-none -z-10">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-800 rounded-xl opacity-0 group-hover:opacity-30 blur-sm group-hover:blur-[2px] transition-all duration-300" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}
