"use client";

import { useState, useCallback, useEffect } from "react";
import { AudioWaveform, Crown, CheckCircle, XCircle, Timer, Activity, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useFileStore } from "../store";
import { useRouter } from "next/navigation";

type PlanDetails = {
  name: string;
  upload_limit_mb: number;
  transcription_mins: number;
  summarization_limit: number | null;
  billing_interval: string | null;
  doc_export_limit: number | null;
  premium_templates?: boolean | null;
  archive_access?: boolean | null;
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
  const [uploadError, setUploadError] = useState<string | null>(null);

  // NEW: remaining minutes from /api/transcription/limits
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);
  const [remainingExports, setRemainingExports] = useState<number | null>(null);
  const [exportsUnlimited, setExportsUnlimited] = useState(false);

  const setFile = useFileStore((state) => state.setFile);
  const router = useRouter();

  useEffect(() => {
    const fetchPlanAndLimits = async () => {
      try {
        setIsLoadingPlan(true);

        const [planRes, limitsRes, exportRes] = await Promise.all([
          fetch("/api/user/plan", { credentials: "include" }),
          fetch("/api/transcription/limits", { credentials: "include" }),
          fetch("/api/exports/limits", { credentials: "include" }),
        ]);

        // Plan details
        if (planRes.ok) {
          const data = await planRes.json();
          const plan = data?.plan;

          if (plan) {
            setPlanDetails(plan);
            setUploadLimit(plan.upload_limit_mb);
          } else {
            // No active subscription -> fallback Free Plan
            const fallback = {
              name: "Free",
              upload_limit_mb: 200,
              transcription_mins: 120,
              summarization_limit: 0,
              billing_interval: null,
              doc_export_limit: 3,
              premium_templates: false,
              archive_access: false,
            };
            setPlanDetails(fallback);
            setUploadLimit(fallback.upload_limit_mb);
          }
        } else if (planRes.status === 403) {
          // No active subscription
          const fallback = {
            name: "Free",
            upload_limit_mb: 200,
            transcription_mins: 120,
            summarization_limit: 0,
            billing_interval: null,
            doc_export_limit: 3,
            premium_templates: false,
            archive_access: false,
          };
          setPlanDetails(fallback);
          setUploadLimit(fallback.upload_limit_mb);
        } else {
          setPlanDetails(null);
          setUploadLimit(null);
        }

        // Limits (remaining minutes)
        if (limitsRes.ok) {
          const lim: LimitResponse = await limitsRes.json();
          setRemainingMinutes(lim.remainingMinutes);
        } else if (limitsRes.status === 401 || limitsRes.status === 403) {
          // Not signed in or no subscription -> treat as 0 mins remaining
          setRemainingMinutes(0);
        } else {
          setRemainingMinutes(null); // unknown
        }

        // Export limits
        if (exportRes.ok) {
          const el = await exportRes.json();
          setExportsUnlimited(el.planLimit === null);
          setRemainingExports(el.remainingExports);
        } else if (exportRes.status === 401 || exportRes.status === 403) {
          setExportsUnlimited(false);
          setRemainingExports(0);
        } else {
          setRemainingExports(null);
        }
      } catch (err) {
        console.error("Failed to fetch plan/limits:", err);
        setPlanDetails(null);
        setUploadLimit(null);
        setRemainingMinutes(null);
        setRemainingExports(null);
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
      const readableLimit = uploadLimit >= 1024 ? `${(uploadLimit / 1024).toFixed(1)} GB` : `${uploadLimit} MB`;
      const readableSize = fileSizeMB >= 1024 ? `${(fileSizeMB / 1024).toFixed(1)} GB` : `${fileSizeMB.toFixed(1)} MB`;

      if (fileSizeMB > uploadLimit) {
        setUploadError(`File is ${readableSize}, but your plan allows up to ${readableLimit}.`);
        return;
      }

      setUploadError(null);
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
      <div className="mb-4 w-full max-w-xl rounded-2xl border border-white/15 bg-white/10 px-5 py-5 text-slate-900 shadow-xl backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/60 dark:text-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {planDetails.name === "Free Plan" ? (
              <AudioWaveform className="w-5 h-5 text-cyan-500 dark:text-gray-300" />
            ) : (
              <Crown className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <h3 className="font-semibold">{planDetails.name}</h3>
              <p className="text-xs text-slate-600 dark:text-gray-400">Subscription</p>
            </div>
          </div>
          {planDetails.billing_interval && (
            <span className="text-xs bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 px-2 py-1 rounded-full border border-cyan-200 dark:border-cyan-700/50">
              {planDetails.billing_interval}ly
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 dark:bg-white/5">
            <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
              <Timer className="w-4 h-4 text-cyan-500" />
              <span>Transcription</span>
            </div>
            <span className="font-semibold text-cyan-200">
              {planDetails.transcription_mins > 0 ? `${planDetails.transcription_mins} mins` : "Not available"}
            </span>
          </div>

          {remainingMinutes != null && remainingMinutes > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 dark:bg-white/5">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Remaining minutes</span>
              </div>
              <span className="font-semibold text-emerald-200">
                {remainingMinutes.toFixed(1)} mins
              </span>
            </div>
          )}

          {planDetails.doc_export_limit !== null && (
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 dark:bg-white/5">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                <Activity className="w-4 h-4 text-cyan-500" />
                <span>Exports per period</span>
              </div>
              <span className="font-semibold text-cyan-200">
                {planDetails.doc_export_limit}
              </span>
            </div>
          )}

          {exportsUnlimited || (remainingExports != null && remainingExports >= 0) ? (
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 dark:bg-white/5">
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Remaining exports</span>
              </div>
              <span className="font-semibold text-blue-200">
                {exportsUnlimited ? "Unlimited" : remainingExports?.toFixed(0)}
              </span>
            </div>
          ) : null}
        </div>

        {planDetails.name === "Free Plan" && (
          <div className="mt-3 p-2 bg-amber-100 border border-amber-200 text-amber-700 dark:bg-yellow-900/20 dark:border-yellow-700/50 dark:text-yellow-400 rounded">
            <div className="flex items-center gap-2 text-xs">
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
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-10 rounded-lg text-center cursor-pointer transition flex flex-col items-center justify-center gap-4 w-96 h-48 bg-white text-slate-600 dark:bg-gray-900 dark:text-gray-200 ${
          isDragActive ? "border-cyan-500 bg-cyan-50 dark:bg-gray-800" : "border-slate-300 dark:border-gray-600"
        }`}
      >
        <input {...getInputProps()} />
        <AudioWaveform className="w-16 h-16 text-cyan-500 dark:text-gray-200" strokeWidth={1.5} />
        <p className="text-lg font-medium text-slate-700 dark:text-gray-100">
          {uploadLimit !== null
            ? `Max file size: ${
                uploadLimit >= 1024
                  ? `${(uploadLimit / 1024).toFixed(1)} GB`
                  : `${uploadLimit} MB`
              }`
            : "Loading your plan..."}
        </p>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Drag & Drop a file here or click to upload
        </p>
        {uploading && (
          <div className="w-full bg-slate-200 dark:bg-gray-700 h-2 rounded-md overflow-hidden">
            <div
              className="h-full bg-cyan-500 dark:bg-cyan-400 transition-all"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="w-96 mx-auto rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 text-left text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-[2px]" />
            <div>
              <p className="text-sm font-semibold">Upload blocked</p>
              <p className="text-sm leading-5">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Supported formats: MP4, MP3, WAV, AAC</span>
      </p>

      <PlanInfo />
    </div>
  );
}
