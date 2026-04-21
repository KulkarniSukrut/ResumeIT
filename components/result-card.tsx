import type { ReactNode } from "react";
import { BriefcaseBusiness, GraduationCap, Mail, Sparkles, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedResume } from "@/lib/types";

function ItemCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-zinc-100">
          <span className="text-indigo-300">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-zinc-300">{children}</CardContent>
    </Card>
  );
}

export function ResultCard({ data }: { data: ParsedResume }) {
  const contact = data.contactInfo ?? {};
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const experience = Array.isArray(data.experience) ? data.experience : [];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-50">Parsed Output</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ItemCard title="Name" icon={<UserRound className="h-4 w-4" />}>
          <p>{(typeof data.name === "string" && data.name) || "Not detected"}</p>
        </ItemCard>

        <ItemCard title="Contact Info" icon={<Mail className="h-4 w-4" />}>
          <div className="space-y-1">
            <p>Email: {contact.email ?? "N/A"}</p>
            <p>Phone: {contact.phone ?? "N/A"}</p>
            {contact.linkedin && <p>LinkedIn: {contact.linkedin}</p>}
            {contact.location && <p>Location: {contact.location}</p>}
          </div>
        </ItemCard>

        <ItemCard title="Skills" icon={<Sparkles className="h-4 w-4" />}>
          <div className="flex flex-wrap gap-2">
            {skills.length ? skills.map((skill) => <Badge key={skill}>{skill}</Badge>) : <p>No skills found.</p>}
          </div>
        </ItemCard>

        <ItemCard title="Education" icon={<GraduationCap className="h-4 w-4" />}>
          <div className="space-y-2">
            {education.length ? (
              education.map((item, idx) => (
                <p key={`edu-${idx}`}>{typeof item === "string" ? item : [item.degree, item.institution, item.year].filter(Boolean).join(" • ")}</p>
              ))
            ) : (
              <p>No education details found.</p>
            )}
          </div>
        </ItemCard>

        <ItemCard title="Experience" icon={<BriefcaseBusiness className="h-4 w-4" />}>
          <div className="space-y-2">
            {experience.length ? (
              experience.map((item, idx) => (
                <p key={`exp-${idx}`}>{typeof item === "string" ? item : [item.role, item.company, item.duration].filter(Boolean).join(" • ")}</p>
              ))
            ) : (
              <p>No experience details found.</p>
            )}
          </div>
        </ItemCard>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base text-zinc-100">Raw JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-52 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-zinc-300">{JSON.stringify(data, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
