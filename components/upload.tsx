"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, FileUp, LoaderCircle, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { parseResume } from "@/lib/api";
import type { ParsedResume, UploadHistoryItem } from "@/lib/types";

type UploadProps = {
  onParsed: (result: ParsedResume) => void;
  onUpload: (item: UploadHistoryItem) => void;
};

export function Upload({ onParsed, onUpload }: UploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setProgress((value) => (value < 90 ? value + 5 : value)), 150);
    return () => clearInterval(timer);
  }, [loading]);

  function validateFile(selected: File | null) {
    if (!selected) return false;
    const validExt = /\.(pdf|docx)$/i.test(selected.name);
    if (!validExt) {
      setError("Please upload a PDF or DOCX resume.");
      return false;
    }
    return true;
  }

  function onFileSelected(selected: File | null) {
    if (!validateFile(selected)) return;
    setError(null);
    setDone(false);
    setProgress(0);
    setFile(selected);
  }

  async function submit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const parsed = await parseResume(file);
      setProgress(100);
      setDone(true);
      onParsed(parsed);
      onUpload({
        id: crypto.randomUUID(),
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="upload" className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-zinc-50">Upload Resume</CardTitle>
        <CardDescription>Drag and drop your resume (PDF/DOCX) to parse instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          className={`rounded-2xl border border-dashed p-8 text-center transition ${dragging ? "border-indigo-400 bg-indigo-500/10" : "border-white/15 bg-black/20"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFileSelected(e.dataTransfer.files?.[0] ?? null);
          }}
          whileHover={{ scale: 1.01 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
          <UploadCloud className="mx-auto mb-3 h-8 w-8 text-indigo-300" />
          <p className="text-zinc-200">Drop your file here or click below</p>
          <Button variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
            <FileUp className="mr-2 h-4 w-4" />
            Select Resume
          </Button>
        </motion.div>

        {file && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <p className="font-medium text-zinc-100">{file.name}</p>
            <p>{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Parsing resume...
              </div>
              <Progress value={progress} />
              <div className="grid gap-2 md:grid-cols-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {done && !loading && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> Parsed successfully.
          </motion.div>
        )}

        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

        <Button disabled={!file || loading} onClick={submit} className="w-full">
          {loading ? "Parsing..." : "Parse Resume"}
        </Button>
      </CardContent>
    </Card>
  );
}
