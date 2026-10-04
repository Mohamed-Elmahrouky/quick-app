'use client';

import React, { useState, useEffect } from 'react';
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
  const [takenIds, setTakenIds] = useState<Set<number>>(new Set());
  const [fullName, setFullName] = useState('');
  const [academicNumber, setAcademicNumber] = useState('');
  const [projectNum, setProjectNum] = useState('');
  const [matchedProject, setMatchedProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SubmissionResult | null>(null);

  // Load projects and taken status
  const loadProjects = () => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => {
        setProjects(d.projects ?? []);
        setTakenIds(new Set(d.takenIds ?? []));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadProjects();
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

  const isCurrentProjectTaken = matchedProject ? takenIds.has(matchedProject.id) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!matchedProject) {
      setError('Please enter a valid project number.');
      return;
    }
    if (isCurrentProjectTaken) {
      setError(`Project #${matchedProject.id} is already taken by another student.`);
      return;
    }
    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[0-9]{5,12}$/.test(academicNumber.trim())) {
      setError('Academic number must be 5 to 12 digits.');
      return;
    }

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
      if (!res.ok) {
        setError(data.error || 'Failed to submit. Please try again.');
        if (res.status === 409) {
          // Refresh list if someone took it
          loadProjects();
        }
        return;
      }

      setSuccess(data.submission);
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.65 } });
    } catch {
      setError('Network connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ✓
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-1">Registration Complete!</h2>
          <p className="text-xs text-stone-500 mb-6">{success.full_name} · Project #{success.project_id}</p>

          <div className="bg-stone-50 rounded-xl p-4 text-left text-xs space-y-2.5 mb-6 border border-stone-100">
            <div className="flex justify-between items-start gap-2">
              <span className="text-stone-500 font-medium">Project #{success.project_id}</span>
              <span className="font-semibold text-stone-900 text-right leading-snug">{success.project_name}</span>
            </div>
            <div className="h-px bg-stone-200/60" />
            <div className="flex justify-between items-center">
              <span className="text-stone-500 font-medium">Academic ID</span>
              <span className="font-mono font-semibold text-stone-800">{success.academic_number}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setSuccess(null);
              setFullName('');
              setAcademicNumber('');
              setProjectNum('');
              setMatchedProject(null);
              loadProjects();
            }}
            className="w-full py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition cursor-pointer"
          >
            Submit Another Project
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] flex flex-col justify-between">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full px-4 pt-8 pb-4 flex justify-between items-center">
        <div>
          <span className="text-sm font-bold text-stone-900 block leading-tight">Project Registration</span>
          <span className="text-[11px] text-stone-400">Mini Project Submission Portal</span>
        </div>
        <Link href="/admin/login" className="text-xs font-medium text-stone-500 hover:text-stone-800 transition py-1 px-2.5 rounded-lg hover:bg-stone-200/50">
          Staff Portal →
        </Link>
      </div>

      {/* Main Registration Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-sm border border-stone-200/90 w-full max-w-md">
          <h1 className="text-xl font-bold text-stone-900 mb-1">Select your project</h1>
          <p className="text-xs text-stone-500 mb-6">Enter your details and project number.</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
              />
            </div>

            {/* Academic Number */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider mb-1.5">
                Academic Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={academicNumber}
                onChange={e => setAcademicNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="5 to 12 digits"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
              />
            </div>

            {/* Project Number */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  Project Number
                </label>
                {projects.length > 0 && (
                  <span className="text-[11px] text-stone-400 font-mono">1 – {projects.length}</span>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                required
                value={projectNum}
                onChange={e => setProjectNum(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:bg-white transition ${
                  matchedProject && !isCurrentProjectTaken
                    ? 'border-emerald-300 bg-emerald-50/30 focus:ring-emerald-500'
                    : matchedProject && isCurrentProjectTaken
                    ? 'border-amber-300 bg-amber-50/30 focus:ring-amber-500'
                    : notFound
                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-400'
                    : 'border-stone-200 bg-stone-50/50 focus:ring-stone-900'
                }`}
              />

              {/* Instant Match: Available */}
              {matchedProject && !isCurrentProjectTaken && (
                <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Project #{matchedProject.id} • Available</span>
                  </div>
                  <p className="text-xs font-medium text-emerald-950 leading-snug">{matchedProject.title}</p>
                </div>
              )}

              {/* Instant Match: Already Taken */}
              {matchedProject && isCurrentProjectTaken && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>Project #{matchedProject.id} is already taken</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-snug">{matchedProject.title}</p>
                  <p className="text-[11px] text-amber-700 mt-1">Please type a different project number.</p>
                </div>
              )}

              {/* Not Found */}
              {notFound && projectNum && (
                <p className="mt-1.5 text-xs text-rose-600">
                  No project with number #{projectNum}. Valid range is 1 to {projects.length}.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !matchedProject || isCurrentProjectTaken}
              className="w-full mt-2 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {submitting ? 'Registering...' : 'Register Project'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-stone-400">
        <Link href="/admin/login" className="hover:text-stone-600 transition">
          Admin Login
        </Link>
      </footer>
    </main>
  );
}
