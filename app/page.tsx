'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

interface Project {
  id: number;
  title: string;
}

interface SubmissionResult {
  full_name: string;
  academic_number: string;
  project_id: number;
  project_name: string;
  created_at: string;
}

export default function Page() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [fullName, setFullName] = useState('');
  const [academicNumber, setAcademicNumber] = useState('');
  const [projectNum, setProjectNum] = useState('');
  const [matchedProject, setMatchedProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmissionResult | null>(null);

  // Load projects once
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []));
  }, []);

  // Live-match project by number as user types
  useEffect(() => {
    const num = parseInt(projectNum, 10);
    if (!projectNum.trim() || isNaN(num)) {
      setMatchedProject(null);
      setNotFound(false);
      return;
    }
    const found = projects.find(p => p.id === num) ?? null;
    setMatchedProject(found);
    setNotFound(!found);
  }, [projectNum, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!matchedProject) { setError('Enter a valid project number.'); return; }
    if (fullName.trim().length < 2) { setError('Enter your full name.'); return; }
    if (!/^[0-9]{5,12}$/.test(academicNumber.trim())) { setError('Academic number: 5–12 digits only.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          academicNumber: academicNumber.trim(),
          projectId: matchedProject.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed. Try again.'); return; }
      setSuccess(data.submission);
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 } });
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-lg font-bold text-stone-900 mb-1">Registered!</h2>
          <p className="text-sm text-stone-500 mb-6">{success.full_name} · #{success.project_id}</p>
          <div className="bg-stone-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-stone-500">Project</span>
              <span className="font-medium text-stone-900 text-right max-w-[180px]">{success.project_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">ID</span>
              <span className="font-mono text-stone-800">{success.academic_number}</span>
            </div>
          </div>
          <button
            onClick={() => { setSuccess(null); setFullName(''); setAcademicNumber(''); setProjectNum(''); setMatchedProject(null); }}
            className="w-full py-2.5 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 transition"
          >
            Register another
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] flex flex-col">
      {/* Nav */}
      <div className="max-w-md mx-auto w-full px-4 pt-8 flex justify-between items-center">
        <span className="text-sm font-semibold text-stone-900">Project Registration</span>
        <Link href="/admin/login" className="text-xs text-stone-500 hover:text-stone-800 transition">Staff →</Link>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-stone-200 w-full max-w-md">
          <h1 className="text-xl font-bold text-stone-900 mb-6">Register your project</h1>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
              />
            </div>

            {/* Academic Number */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Academic Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={academicNumber}
                onChange={e => setAcademicNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
              />
            </div>

            {/* Project Number */}
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Project Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={projectNum}
                onChange={e => setProjectNum(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  matchedProject
                    ? 'border-emerald-300 bg-emerald-50 focus:ring-emerald-500'
                    : notFound
                    ? 'border-rose-300 bg-rose-50 focus:ring-rose-400'
                    : 'border-stone-200 bg-stone-50 focus:ring-stone-900'
                }`}
              />
              {/* Live preview */}
              {matchedProject && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                  <span className="text-emerald-600 font-bold text-xs mt-0.5 shrink-0">#{matchedProject.id}</span>
                  <span className="text-emerald-800 text-xs font-medium leading-snug">{matchedProject.title}</span>
                </div>
              )}
              {notFound && projectNum && (
                <p className="mt-1.5 text-xs text-rose-600">No project with that number.</p>
              )}
              {!projectNum && projects.length > 0 && (
                <p className="mt-1.5 text-xs text-stone-400">
                  {projects.length} projects available — type a number to find yours
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !matchedProject}
              className="w-full mt-2 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>
      </div>

      <div className="text-center pb-6 text-xs text-stone-400">
        <Link href="/admin/login" className="hover:text-stone-600 transition">Admin</Link>
      </div>
    </main>
  );
}
