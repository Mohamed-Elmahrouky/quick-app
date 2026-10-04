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

type Tab = 'submissions' | 'availability' | 'projects';

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availSearch, setAvailSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('submissions');
  const [availFilter, setAvailFilter] = useState<'all' | 'taken' | 'available'>('all');

  const fetchAll = async () => {
    setLoading(true);
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
    if (!confirm(`Delete project #${id}?`)) return;
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

  // Map project_id → student info
  const takenMap = useMemo(() => {
    const map = new Map<number, Submission>();
    submissions.forEach(s => { if (s.project_id) map.set(s.project_id, s); });
    return map;
  }, [submissions]);

  // Filtered submissions
  const filteredSubs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return submissions;
    return submissions.filter(s =>
      s.full_name.toLowerCase().includes(q) ||
      s.academic_number.includes(q) ||
      s.project_name?.toLowerCase().includes(q) ||
      String(s.project_id).includes(q)
    );
  }, [submissions, search]);

  // Projects availability list
  const availabilityList = useMemo(() => {
    return projects.map(p => ({
      ...p,
      takenBy: takenMap.get(p.id) ?? null,
    }));
  }, [projects, takenMap]);

  const filteredAvail = useMemo(() => {
    let list = availabilityList;
    if (availFilter === 'taken') list = list.filter(p => p.takenBy);
    if (availFilter === 'available') list = list.filter(p => !p.takenBy);
    const q = availSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      p.takenBy?.full_name.toLowerCase().includes(q) ||
      p.takenBy?.academic_number.includes(q)
    );
  }, [availabilityList, availFilter, availSearch]);

  const takenCount = useMemo(() => availabilityList.filter(p => p.takenBy).length, [availabilityList]);
  const availableCount = useMemo(() => availabilityList.filter(p => !p.takenBy).length, [availabilityList]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'submissions', label: `Submissions (${submissions.length})` },
    { id: 'availability', label: `Projects (${projects.length})` },
    { id: 'projects', label: 'Manage' },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="font-bold text-stone-900 text-sm shrink-0">Admin</span>
            <div className="flex gap-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" target="_blank" className="text-xs text-stone-500 hover:text-stone-800 transition hidden sm:block">Student form ↗</Link>
            <a href="/api/export" download className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition">
              Export
            </a>
            <button onClick={handleLogout} className="text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* ─── SUBMISSIONS TAB ─── */}
        {activeTab === 'submissions' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Total submissions', value: submissions.length },
                { label: 'Unique students', value: new Set(submissions.map(s => s.academic_number)).size },
                { label: 'Projects taken', value: takenCount },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl p-4 border border-stone-200">
                  <div className="text-2xl font-bold text-stone-900">{loading ? '—' : stat.value}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-3 mb-4">
              <input type="text" placeholder="Search by name, ID, or project…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition" />
              <button onClick={fetchAll} className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-500 hover:text-stone-800 transition cursor-pointer">
                Refresh
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="py-14 text-center text-sm text-stone-400">Loading…</div>
              ) : filteredSubs.length === 0 ? (
                <div className="py-14 text-center text-sm text-stone-400">No submissions yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left">#</th>
                        <th className="py-3 px-4 text-left">Student</th>
                        <th className="py-3 px-4 text-left">Academic ID</th>
                        <th className="py-3 px-4 text-left">Project</th>
                        <th className="py-3 px-4 text-left">Submitted</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredSubs.map((s, i) => (
                        <tr key={s.id} className="hover:bg-stone-50 transition">
                          <td className="py-3 px-4 text-stone-400 font-mono text-xs">{i + 1}</td>
                          <td className="py-3 px-4 font-medium text-stone-900">{s.full_name}</td>
                          <td className="py-3 px-4 font-mono text-xs text-stone-600">{s.academic_number}</td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="flex items-center gap-1.5">
                              {s.project_id && (
                                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-mono text-[11px]">
                                  #{s.project_id}
                                </span>
                              )}
                              <span className="text-stone-800 leading-snug">{s.project_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-stone-500 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' '}
                            <span className="text-stone-400">
                              {new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
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

        {/* ─── AVAILABILITY TAB ─── */}
        {activeTab === 'availability' && (
          <>
            {/* Summary pills */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-4 border border-stone-200">
                <div className="text-2xl font-bold text-stone-900">{projects.length}</div>
                <div className="text-xs text-stone-500 mt-0.5">Total projects</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/40">
                <div className="text-2xl font-bold text-rose-600">{takenCount}</div>
                <div className="text-xs text-rose-500 mt-0.5">Taken</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-emerald-200 bg-emerald-50/40">
                <div className="text-2xl font-bold text-emerald-600">{availableCount}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Available</div>
              </div>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex gap-1 bg-white border border-stone-200 rounded-xl p-1">
                {(['all', 'available', 'taken'] as const).map(f => (
                  <button key={f} onClick={() => setAvailFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer capitalize ${
                      availFilter === f
                        ? f === 'taken' ? 'bg-rose-600 text-white'
                          : f === 'available' ? 'bg-emerald-600 text-white'
                          : 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}>
                    {f === 'all' ? `All (${projects.length})` : f === 'taken' ? `Taken (${takenCount})` : `Available (${availableCount})`}
                  </button>
                ))}
              </div>
              <input type="text" placeholder="Search by title, #, or student name…" value={availSearch}
                onChange={e => setAvailSearch(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 transition" />
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              {loading ? (
                <div className="py-14 text-center text-sm text-stone-400">Loading…</div>
              ) : filteredAvail.length === 0 ? (
                <div className="py-14 text-center text-sm text-stone-400">No projects found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left w-16">No.</th>
                        <th className="py-3 px-4 text-left">Project Title</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 text-left">Assigned To</th>
                        <th className="py-3 px-4 text-left">Academic ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredAvail.map(p => (
                        <tr key={p.id} className="hover:bg-stone-50/80 transition">
                          <td className="py-3 px-4 font-mono text-xs text-stone-400">#{p.id}</td>
                          <td className="py-3 px-4 text-stone-800 font-medium max-w-xs leading-snug">{p.title}</td>
                          <td className="py-3 px-4">
                            {p.takenBy ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                Taken
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                Available
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-stone-700">
                            {p.takenBy?.full_name ?? <span className="text-stone-300">—</span>}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-stone-500">
                            {p.takenBy?.academic_number ?? <span className="text-stone-300">—</span>}
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

        {/* ─── MANAGE PROJECTS TAB ─── */}
        {activeTab === 'projects' && (
          <>
            {/* Upload */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-5">
              <h2 className="font-semibold text-stone-900 mb-1">Add projects via Excel</h2>
              <p className="text-xs text-stone-500 mb-4">
                Upload a <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">.xlsx</code> file.
                Column A = project titles, row 2 onward (row 1 = header). IDs are auto-assigned continuing from the last one.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <input ref={fileRef} type="file" accept=".xlsx" onChange={handleUpload} className="hidden" id="project-file" />
                <label htmlFor="project-file"
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition cursor-pointer">
                  {uploading ? 'Uploading…' : 'Choose Excel file'}
                </label>
                {uploadMsg && <span className="text-xs text-emerald-700 font-medium">{uploadMsg}</span>}
                {uploadErr && <span className="text-xs text-rose-600">{uploadErr}</span>}
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900">{projects.length} Projects</span>
                <span className="text-xs text-stone-400">Last ID: {projects.length > 0 ? `#${projects[projects.length - 1].id}` : '—'}</span>
              </div>
              {loading ? (
                <div className="py-12 text-center text-sm text-stone-400">Loading…</div>
              ) : projects.length === 0 ? (
                <div className="py-12 text-center text-sm text-stone-400">No projects yet. Upload an Excel file above.</div>
              ) : (
                <div className="overflow-y-auto max-h-[60vh] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-left w-16">No.</th>
                        <th className="py-3 px-4 text-left">Title</th>
                        <th className="py-3 px-4 text-left">Status</th>
                        <th className="py-3 px-4 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {projects.map(p => {
                        const taken = takenMap.get(p.id);
                        return (
                          <tr key={p.id} className="hover:bg-stone-50 transition">
                            <td className="py-2.5 px-4 font-mono text-xs text-stone-400">#{p.id}</td>
                            <td className="py-2.5 px-4 text-stone-800">{p.title}</td>
                            <td className="py-2.5 px-4">
                              {taken ? (
                                <span className="text-xs text-rose-600 font-medium">{taken.full_name}</span>
                              ) : (
                                <span className="text-xs text-emerald-600">Available</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {!taken && (
                                <button onClick={() => handleDeleteProject(p.id)}
                                  className="text-xs text-stone-300 hover:text-rose-600 transition cursor-pointer">×</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
