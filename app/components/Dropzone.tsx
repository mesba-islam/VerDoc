"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { AudioWaveform } from "lucide-react";
import { useFileStore } from "../store"; // Import Zustand store
import { useRouter } from "next/navigation"; // For navigation

export default function Dropzone() {
  const [uploadLimit, setUploadLimit] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const setFile = useFileStore((state) => state.setFile); // Zustand store function
  const router = useRouter(); // Router for navigation

  // useEffect(() => {
  //   const fetchLimit = async () => {
  //     const res = await fetch("/api/user/plan");
  //     if (res.ok) {
  //       const data = await res.json();
  //       setUploadLimit(data.plan.upload_limit_mb);
  //     }
  //   };
  //   fetchLimit();
  // }, []);

  useEffect(() => {
    const fetchLimit = async () => {
      try {
        const res = await fetch("/api/user/plan");
  
        if (res.ok) {
          const data = await res.json();
          const limit = data?.plan?.upload_limit_mb;
  
          if (typeof limit === "number") {
            setUploadLimit(limit);
          } else {
            // If plan exists but limit is not a number
            setUploadLimit(50);
          }
        } else if (res.status === 403) {
          // Logged in but no active subscription
          setUploadLimit(50);
        } else {
          // Not authorized or some other issue
          setUploadLimit(null);
        }
      } catch (error) {
        console.error("Failed to fetch plan:", error);
        setUploadLimit(null);
      }
    };
  
    fetchLimit();
  }, []);
  

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0 || uploadLimit === null) return;

      const file = acceptedFiles[0];
      const fileSizeMB = file.size / (1024 * 1024); // Convert to MB

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

  return (
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
  );
}
