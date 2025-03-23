"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { AudioWaveform } from "lucide-react";
import { useFileStore } from "../store"; // Import Zustand store
import { useRouter } from "next/navigation"; // For navigation

export default function Dropzone() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const setFile = useFileStore((state) => state.setFile); // Zustand store function
  const router = useRouter(); // Router for navigation

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file); // Save to Zustand
      simulateUpload(() => router.push("/transcribe")); // Redirect after upload
    }
  }, [setFile, router]);

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
