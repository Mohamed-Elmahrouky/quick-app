'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase-browser';

interface Submission {
  id: string;
  full_name: string;
  academic_number: string;
  project_name: string;
  project_id: number | null;
  created_at: string;
}

interface Project {
  id: number;
  title: string;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'projects'>('submissions');

  const fetchAll = async () => {
    const [{ data: subs }, { data: projs }] = await Promise.all([
      supabase.from('submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('*').order('id', { ascending: true }),
    ]);
    setSubmissions(subs ?? []);
    setProjects(projs ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this submission?')) return;
    setDeletingId(id);
    await supabase.from('submissions').delete().eq('id', id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm(`Delete project #${id}? This may affect existing submissions.`)) return;
    await supabase.from('projects').delete().eq('id', id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload-projects', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadErr(data.error); return; }
      setUploadMsg(data.message);
      fetchAll();
    } catch {
      setUploadErr('Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return submissions;
    return submissions.filter(s =>
      s.full_name.toLowerCase().includes(q) ||
      s.academic_number.includes(q) ||
      s.project_name.toLowerCase().includes(q) ||
      String(s.project_id).includes(q)
    );
  }, [submissions, search]);

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold text-stone-900 text-sm">Admin</span>
            <div className="flex gap-1">
              {(['submissions', 'projects'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer capitalize ${
                    activeTab === tab ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="text-xs text-stone-500 hover:text-stone-800 transition">Student form ↗</Link>
            <a href="/api/export" download className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition">
              Export Excel
            </a>
            <button onClick={handleLogout} className="text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'submissions' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Submissions', value: submissions.length },
                { label: 'Unique Students', value: new Set(submissions.map(s => s.academic_number)).size },
                { label: 'Projects Used', value: new Set(submissions.map(s => s.project_id).filter(Boolean)).size },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl p-5 border border-stone-200">
                  <div className="text-2xl font-bold text-stone-900">{loading ? '—' : stat.value}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-4">
              <input
                type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition"
              />
              <span className="text-xs text-stone-500 whitespace-nowrap">{filtered.length} / {submissions.length}</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-sm text-stone-500">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-sm text-stone-500">No submissions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left">#</th>
                        <th className="py-3 px-4 text-left">Name</th>
                        <th className="py-3 px-4 text-left">Academic ID</th>
                        <th className="py-3 px-4 text-left">Project</th>
                        <th className="py-3 px-4 text-left">Date</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filtered.map((s, i) => (
                        <tr key={s.id} className="hover:bg-stone-50 transition">
                          <td className="py-3 px-4 text-stone-400 font-mono text-xs">{i + 1}</td>
                          <td className="py-3 px-4 font-medium text-stone-900">{s.full_name}</td>
                          <td className="py-3 px-4 font-mono text-xs text-stone-600">{s.academic_number}</td>
                          <td className="py-3 px-4 text-stone-800 max-w-xs">
                            {s.project_id && <span className="text-stone-400 font-mono text-xs mr-2">#{s.project_id}</span>}
                            {s.project_name}
                          </td>
                          <td className="py-3 px-4 text-xs text-stone-500 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                              className="text-xs text-stone-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-40">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'projects' && (
          <>
            {/* Upload section */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
              <h2 className="font-semibold text-stone-900 mb-1">Add Projects via Excel</h2>
              <p className="text-xs text-stone-500 mb-4">
                Upload a .xlsx file. Column A = project titles, starting from row 2 (row 1 = header). Numbers are assigned automatically, continuing after the last existing ID.
              </p>
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept=".xlsx" onChange={handleUpload} className="hidden" id="project-file" />
                <label htmlFor="project-file"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition cursor-pointer">
                  {uploading ? 'Uploading…' : 'Choose Excel File'}
                </label>
                {uploadMsg && <span className="text-xs text-emerald-700 font-medium">{uploadMsg}</span>}
                {uploadErr && <span className="text-xs text-rose-600">{uploadErr}</span>}
              </div>
            </div>

            {/* Projects list */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900">{projects.length} Projects</span>
                <span className="text-xs text-stone-500">Last ID: {projects.length > 0 ? projects[projects.length - 1].id : '—'}</span>
              </div>
              {loading ? (
                <div className="py-12 text-center text-sm text-stone-500">Loading…</div>
              ) : projects.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-500">No projects yet. Upload an Excel file to add some.</div>
              ) : (
                <div className="overflow-y-auto max-h-[60vh]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left w-16">No.</th>
                        <th className="py-3 px-4 text-left">Title</th>
                        <th className="py-3 px-4 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {projects.map(p => (
                        <tr key={p.id} className="hover:bg-stone-50 transition">
                          <td className="py-2.5 px-4 font-mono text-xs text-stone-400">#{p.id}</td>
                          <td className="py-2.5 px-4 text-stone-800">{p.title}</td>
                          <td className="py-2.5 px-4 text-right">
                            <button onClick={() => handleDeleteProject(p.id)}
                              className="text-xs text-stone-400 hover:text-rose-600 transition cursor-pointer">
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
