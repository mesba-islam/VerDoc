"use client";

import { useState, useCallback, useEffect } from "react";
import { AudioWaveform, Crown, CheckCircle, XCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useFileStore } from "../store";
import { useRouter } from "next/navigation";

type PlanDetails = {
  name: string;
  upload_limit_mb: number;
  transcription_mins: number;
  summarization_limit: number | null;
  billing_interval: string | null;
};

// NEW: mirrors the Transcribe page type
type LimitResponse = {
  canTranscribe: boolean;
  message: string;
  remainingMinutes: number;
};

export default function Dropzone() {
  const [uploadLimit, setUploadLimit] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [planDetails, setPlanDetails] = useState<PlanDetails | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  // NEW: remaining minutes from /api/transcription/limits
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  const setFile = useFileStore((state) => state.setFile);
  const router = useRouter();

  useEffect(() => {
    const fetchPlanAndLimits = async () => {
      try {
        setIsLoadingPlan(true);

        const [planRes, limitsRes] = await Promise.all([
          fetch("/api/user/plan", { credentials: "include" }),
          fetch("/api/transcription/limits", { credentials: "include" }),
        ]);

        // Plan details
        if (planRes.ok) {
          const data = await planRes.json();
          const plan = data?.plan;

          if (plan) {
            setPlanDetails(plan);
            setUploadLimit(plan.upload_limit_mb);
          } else {
            // No active subscription → fallback Free Plan
            setPlanDetails({
              name: "Free Plan",
              upload_limit_mb: 50,
              transcription_mins: 0,
              summarization_limit: 0,
              billing_interval: null,
            });
            setUploadLimit(50);
          }
        } else if (planRes.status === 403) {
          // No active subscription
          setPlanDetails({
            name: "Free Plan",
            upload_limit_mb: 50,
            transcription_mins: 0,
            summarization_limit: 0,
            billing_interval: null,
          });
          setUploadLimit(50);
        } else {
          setPlanDetails(null);
          setUploadLimit(null);
        }

        // Limits (remaining minutes)
        if (limitsRes.ok) {
          const lim: LimitResponse = await limitsRes.json();
          setRemainingMinutes(lim.remainingMinutes);
        } else if (limitsRes.status === 401 || limitsRes.status === 403) {
          // Not signed in or no subscription → treat as 0 mins remaining
          setRemainingMinutes(0);
        } else {
          setRemainingMinutes(null); // unknown
        }
      } catch (err) {
        console.error("Failed to fetch plan/limits:", err);
        setPlanDetails(null);
        setUploadLimit(null);
        setRemainingMinutes(null);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    fetchPlanAndLimits();
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || uploadLimit === null) return;

      const file = acceptedFiles[0];
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB > uploadLimit) {
        alert(`File size exceeds your plan's upload limit of ${uploadLimit}MB.`);
        return;
      }

      setFile(file);
      simulateUpload(() => router.push("/transcribe"));
    },
    [setFile, router, uploadLimit]
  );

  const simulateUpload = (callback: () => void) => {
    setUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setUploading(false);
        callback();
      }
    }, 300);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const PlanInfo = () => {
    if (isLoadingPlan) {
      return (
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      );
    }

    if (!planDetails) {
      return (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Unable to load plan details</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 p-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/50 rounded-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {planDetails.name === "Free Plan" ? (
              <AudioWaveform className="w-5 h-5 text-gray-400" />
            ) : (
              <Crown className="w-5 h-5 text-yellow-400" />
            )}
            <h3 className="font-semibold text-gray-200">{planDetails.name}</h3>
          </div>
          {planDetails.billing_interval && (
            <span className="text-xs bg-cyan-900/50 text-cyan-300 px-2 py-1 rounded-full border border-cyan-700/50">
              {planDetails.billing_interval}ly
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Upload Limit:</span>
            <span className="font-medium text-gray-200">
              {planDetails.upload_limit_mb}MB
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Transcription Limit:</span>
            <span className="font-medium text-gray-200">
              {planDetails.transcription_mins > 0
                ? `${planDetails.transcription_mins} mins`
                : "Not available"}
            </span>
          </div>

          {/* NEW: Remaining minutes (from /api/transcription/limits) */}
          {/* <div className="flex items-center justify-between">
            <span className="text-gray-400">Remaining Times:</span>
            <span className="font-medium text-gray-200">
              {remainingMinutes == null ? "—" : `${remainingMinutes.toFixed(1)} mins`}
            </span>
          </div> */}

          {remainingMinutes != null && remainingMinutes > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Remaining Times:</span>
              <span className="font-medium text-gray-200">
                {remainingMinutes.toFixed(1)} mins
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Summaries:</span>
            <span className="font-medium text-gray-200">
              {planDetails.summarization_limit === null
                ? "Unlimited"
                : planDetails.summarization_limit > 0
                ? `${planDetails.summarization_limit} PDFs`
                : "Not available"}
            </span>
          </div>
        </div>

        {planDetails.name === "Free Plan" && (
          <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded">
            <div className="flex items-center gap-2 text-yellow-400 text-xs">
              <CheckCircle className="w-3 h-3" />
              <span>Upgrade for more features and higher limits</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PlanInfo />

      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-10 rounded-lg text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 w-96 h-48 ${
          isDragActive ? "border-cyan-500 bg-gray-100" : "border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <AudioWaveform className="w-16 h-16 text-gray-600" strokeWidth={1.5} />
        <p className="text-lg font-medium text-gray-500">
          {uploadLimit !== null
            ? `Max file size: ${uploadLimit}MB`
            : "Loading your plan..."}
        </p>
        <p className="text-sm text-gray-400">
          Drag & Drop a file here or click to upload
        </p>
        {uploading && (
          <div className="w-full bg-gray-200 h-2 rounded-md overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}
