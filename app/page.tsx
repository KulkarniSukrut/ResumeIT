"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock4 } from "lucide-react";
import { motion } from "framer-motion";

import { Navbar } from "@/components/navbar";
import { ResultCard } from "@/components/result-card";
import { Upload } from "@/components/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedResume, UploadHistoryItem } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<ParsedResume | null>(null);
  const [recent, setRecent] = useState<UploadHistoryItem[]>([]);
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("light", lightMode);
  }, [lightMode]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b33,transparent_45%),linear-gradient(180deg,#05070f_0%,#090b14_100%)] text-zinc-50">
      <Navbar lightMode={lightMode} onToggleTheme={() => setLightMode((v) => !v)} />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-12">
          <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-5">
            <p className="inline-block rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs text-indigo-200">AI Resume Parser</p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">ResumeIT</h1>
            <p className="max-w-2xl text-zinc-300">Turn unstructured resumes into structured insights instantly.</p>
            <Button onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}>
              Upload Resume <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Upload
            onParsed={setResult}
            onUpload={(item) => setRecent((prev) => [item, ...prev].slice(0, 5))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-zinc-50">
                <Clock4 className="h-4 w-4 text-indigo-300" /> Recent Uploads
              </CardTitle>
              <CardDescription>Latest resumes parsed by your workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No uploads yet. Parsed resumes will appear here.</p>
              ) : (
                <ul className="space-y-2 text-sm text-zinc-300">
                  {recent.map((item) => (
                    <li key={`${item.fileName}-${item.uploadedAt}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="font-medium text-zinc-100">{item.fileName}</p>
                      <p>{(item.fileSize / 1024).toFixed(1)} KB</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {result && <ResultCard data={result} />}
      </main>
    </div>
  );
}
