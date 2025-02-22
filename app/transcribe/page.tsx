"use client";

import DropzoneComponent from "@/app/components/Dropzone";
import { useFileStore } from "@/app/store";

export default function TranscribePage() {
  const file = useFileStore((state) => state.file);

  return (
    <div className="flex flex-col items-center gap-6 mt-10">
      <h1 className="text-2xl font-bold">Upload & Transcribe</h1>
      
      {/* Dropzone Component */}
      <DropzoneComponent />

      {/* Show Uploaded File if Exists */}
      {file && (
        <div className="w-full max-w-2xl p-4 border border-gray-300 rounded-lg shadow-md flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-700">{file.name}</h2>
          
          {file.type.startsWith("video/") ? (
            <video controls className="w-full rounded-lg">
              <source src={URL.createObjectURL(file)} type={file.type} />
              Your browser does not support the video tag.
            </video>
          ) : (
            <audio controls className="w-full">
              <source src={URL.createObjectURL(file)} type={file.type} />
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}
    </div>
  );
}
