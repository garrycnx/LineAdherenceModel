'use client';

import { useRef, useState, DragEvent } from 'react';
import { cn, downloadBlob } from '@/lib/utils';

interface FileUploaderProps {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  hint?: string;
  sampleCsvContent?: string;
  sampleFileName?: string;
  currentFile?: File | null;
  parseError?: string | null;
}

export default function FileUploader({
  onFile,
  accept = '.csv',
  label = 'Upload CSV File',
  hint = 'Drag & drop or click to browse',
  sampleCsvContent,
  sampleFileName = 'sample.csv',
  currentFile,
  parseError,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const handleDownloadSample = () => {
    if (!sampleCsvContent) return;
    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, sampleFileName);
  };

  const hasFile = !!currentFile;
  const hasError = !!parseError;

  return (
    <div className="space-y-2">
      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'upload-cta cursor-pointer select-none',
          dragOver && 'border-brand-400 bg-brand-900/20',
          hasError && 'border-red-500/60',
          hasFile && !hasError && 'border-green-500/60 bg-green-900/10'
        )}
      >
        {hasFile && !hasError ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">✅</span>
            <p className="text-sm font-medium text-green-300">{currentFile.name}</p>
            <p className="text-xs text-gray-400">
              {(currentFile.size / 1024).toFixed(1)} KB · Click to replace
            </p>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-medium text-red-400">Parse Error</p>
            <p className="text-xs text-red-300 max-w-xs text-center">{parseError}</p>
            <p className="text-xs text-gray-500 mt-1">Click to try another file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl">{dragOver ? '📂' : '📁'}</span>
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <p className="text-xs text-gray-500">{hint}</p>
            <p className="text-xs text-gray-600 mt-1">Accepts: {accept}</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Sample CSV download */}
      {sampleCsvContent && (
        <button
          type="button"
          onClick={handleDownloadSample}
          className="w-full text-xs text-brand-400 hover:text-brand-300 py-1.5 border border-gray-800 rounded-lg hover:border-brand-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>⬇</span>
          Download sample {sampleFileName}
        </button>
      )}
    </div>
  );
}
