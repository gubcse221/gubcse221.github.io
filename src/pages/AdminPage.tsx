import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, Student } from '../lib/supabase';
import { CheckCircle, XCircle, Trash2, LogOut, Download } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.trim(); // Optional: only this email can access admin

export default function AdminPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editableStudent, setEditableStudent] = useState<Student | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ipInfo, setIpInfo] = useState<any | null>(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const PAGE_SIZE = 10;

  const saveButtonRef = useRef<HTMLButtonElement>(null); // ref for Save Changes button

  const queryClient = useQueryClient();

  useEffect(() => {
    const client = supabase;
    if (!client || !isSupabaseConfigured) {
      setAuthChecking(false);
      return;
    }
    const checkSession = async () => {
      const { data: { session } } = await client.auth.getSession();
      if (session?.user) {
        const allowed = !ADMIN_EMAIL || session.user.email === ADMIN_EMAIL;
        if (allowed) {
          setAuthenticated(true);
          setUserEmail(session.user.email ?? null);
        }
      }
      setAuthChecking(false);
    };
    checkSession();

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthenticated(false);
        setUserEmail(null);
        return;
      }
      const allowed = !ADMIN_EMAIL || session.user.email === ADMIN_EMAIL;
      setAuthenticated(allowed);
      setUserEmail(allowed ? (session.user.email ?? null) : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: pendingQuery, isLoading: isPendingLoading } = useQuery<Student[]>({
    queryKey: ['students', 'pending'],
    enabled: authenticated && !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('students')
        .select('*')
        .eq('authorized', 0)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Student[];
    },
    staleTime: 1000 * 15,
  });

  const approvedQuery = useQuery<Student[]>({
    queryKey: ['students', 'approved'],
    enabled: authenticated && !!supabase,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('students')
        .select('*')
        .eq('authorized', 1)
        .order('student_id', { ascending: true });
      if (error) throw error;
      return (data || []) as Student[];
    },
    staleTime: 1000 * 15,
  });

  const pendingStudents = pendingQuery || [];
  const approvedStudents = approvedQuery.data || [];
  const loading = isPendingLoading || approvedQuery.isLoading;

  const pendingTotalPages = Math.max(1, Math.ceil(pendingStudents.length / PAGE_SIZE));
  const approvedTotalPages = Math.max(1, Math.ceil(approvedStudents.length / PAGE_SIZE));

  const pagedPending = pendingStudents.slice(
    (pendingPage - 1) * PAGE_SIZE,
    pendingPage * PAGE_SIZE
  );
  const pagedApproved = approvedStudents.slice(
    (approvedPage - 1) * PAGE_SIZE,
    approvedPage * PAGE_SIZE
  );

  const selectedStudentLatest = useMemo(() => {
    if (!selectedStudent) return null;
    return [...pendingStudents, ...approvedStudents].find((s) => s.id === selectedStudent.id) || selectedStudent;
  }, [selectedStudent, pendingStudents, approvedStudents]);

  useEffect(() => {
    if (!selectedStudentLatest) return;
    setSelectedStudent(selectedStudentLatest);
    setEditableStudent(selectedStudentLatest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentLatest?.id]);

  const approveMutation = useMutation({
    mutationFn: async (student: Student) => {
      const { error } = await supabase!
        .from('students')
        .update({
          authorized: 1,
          profile_photo_url: student.profile_photo_base64 || student.profile_photo_url,
          cover_photo_url: student.cover_photo_base64 || student.cover_photo_url,
          approved_by: userEmail ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (student: Student) => {
      const { error } = await supabase!.from('students').delete().eq('id', student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (s: Student) => {
      const { error } = await supabase!
        .from('students')
        .update({
          name: s.name,
          student_id: s.student_id,
          email: s.email,
          phone_number: s.phone_number,
          blood_group: s.blood_group,
          gender: s.gender,
          facebook_url: s.facebook_url,
          twitter_url: s.twitter_url,
          linkedin_url: s.linkedin_url,
          hometown: s.hometown,
          permanent_address: s.permanent_address,
          present_address: s.present_address,
          religion: s.religion,
          job_designation: s.job_designation,
          organization_name: s.organization_name,
        })
        .eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const exportJsonMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase!
        .from('students')
        .select('*')
        .order('student_id', { ascending: true })
        .range(0, 9999);
      if (error) throw error;
      return (data || []) as Student[];
    },
    onSuccess: (data) => {
      const payload = {
        exported_at: new Date().toISOString(),
        exported_by: userEmail,
        count: (data || []).length,
        students: data || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `students-export-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'JSON exported successfully.' });
      setTimeout(() => setMessage(null), 2000);
    },
    onError: () => {
      setMessage({ type: 'error', text: 'Failed to export JSON.' });
    },
  });

  // (restoreFromJsonMutation previously used for local JSON restore; removed to keep lints clean)

  // Fetch geo info for selected student's IP using geo.js
  useEffect(() => {
    setIpInfo(null);
    setIpError(null);
    if (!selectedStudent?.submit_ip) {
      setIpLoading(false);
      return;
    }

    let cancelled = false;
    const loadGeo = async () => {
      try {
        setIpLoading(true);
        const res = await fetch(
          `https://get.geojs.io/v1/ip/geo.json?ip=${encodeURIComponent(
            selectedStudent.submit_ip as string
          )}`
        );
        if (!res.ok) throw new Error(`geo.js error ${res.status}`);
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw[0] : raw;
        if (!cancelled) {
          setIpInfo(data);
        }
      } catch (e) {
        if (!cancelled) {
          setIpError('Could not load location for this IP.');
        }
      } finally {
        if (!cancelled) {
          setIpLoading(false);
        }
      }
    };

    loadGeo();

    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.submit_ip]);

  const handleApprove = async (student: Student) => {
    if (!supabase) return;
    try {
      await approveMutation.mutateAsync(student);
      setMessage({ type: 'success', text: `${student.name} approved!` });
      setSelectedStudent(null);
      setEditableStudent(null);
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to approve student' });
    }
  };

  const handleDelete = async (student: Student) => {
    if (!supabase) return;
    if (!window.confirm(`Delete ${student.name} (${student.student_id})? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(student);
      setMessage({ type: 'success', text: `${student.name} removed` });
      setSelectedStudent(null);
      setEditableStudent(null);
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete student' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (ADMIN_EMAIL && data.user?.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        setMessage({ type: 'error', text: 'This account is not authorized for admin access.' });
        return;
      }
      setAuthenticated(true);
      setUserEmail(data.user?.email ?? null);
      setEmail('');
      setPassword('');
      setMessage({ type: 'success', text: 'Logged in successfully' });
      setTimeout(() => setMessage(null), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setMessage({ type: 'error', text: msg.includes('Invalid login') ? 'Invalid email or password.' : msg });
      setPassword('');
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthenticated(false);
    setUserEmail(null);
    setSelectedStudent(null);
    setEditableStudent(null);
    setMessage({ type: 'success', text: 'Signed out' });
    setTimeout(() => setMessage(null), 2000);
  };

  // Keyboard F9 handler for saving changes
  const handleF9Save = useCallback((e: KeyboardEvent) => {
    // Only trigger if edit dialog is open and Save Changes is not already pending
    if (e.key === "F9" && selectedStudent && editableStudent && !updateMutation.isPending) {
      e.preventDefault();
      if (saveButtonRef.current) {
        saveButtonRef.current.click();
      }
    }
  }, [selectedStudent, editableStudent, updateMutation.isPending]);

  useEffect(() => {
    window.addEventListener('keydown', handleF9Save);
    return () => {
      window.removeEventListener('keydown', handleF9Save);
    };
  }, [handleF9Save]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Panel</h1>
          <p className="text-amber-700 mb-6">Database not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
          <a href="/" className="text-green-600 hover:text-green-700 font-semibold">Back to Directory</a>
        </div>
      </div>
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Checking login...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Panel</h1>
          <p className="text-gray-600 mb-6">Sign in with your admin account</p>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-bold py-3 rounded-lg transition-all"
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <a
              href="/"
              className="text-green-600 hover:text-green-700 font-semibold text-center block"
            >
              Back to Directory
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-600">
              {userEmail ? `Signed in as ${userEmail}` : 'Manage student submissions'}
            </p>
          </div>
          <div className="flex gap-2">
            {/* <button
              type="button"
              onClick={() => restoreFromJsonMutation.mutate()}
              disabled={restoreFromJsonMutation.isPending}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              <Download size={18} />
              {restoreFromJsonMutation.isPending ? 'Restoring...' : 'Restore from JSON'}
            </button> */}
            <button
              type="button"
              onClick={() => exportJsonMutation.mutate()}
              disabled={exportJsonMutation.isPending}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              <Download size={18} />
              {exportJsonMutation.isPending ? 'Exporting...' : 'Download JSON'}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              <LogOut size={18} />
              Sign out
            </button>
            <a
              href="/"
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
            >
              Back to Directory
            </a>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="text-emerald-600" size={20} />
            ) : (
              <XCircle className="text-red-600" size={20} />
            )}
            <p className={message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 py-1 rounded-full font-semibold ${
                      activeTab === 'pending'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-700'
                    }`}
                  >
                    Pending ({pendingStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('approved')}
                    className={`px-3 py-1 rounded-full font-semibold ${
                      activeTab === 'approved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-700'
                    }`}
                  >
                    Approved ({approvedStudents.length})
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  {activeTab === 'pending'
                    ? `Page ${pendingPage} of ${pendingTotalPages}`
                    : `Page ${approvedPage} of ${approvedTotalPages}`}
                </div>
              </div>

              {activeTab === 'pending' ? (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Pending Approvals
                  </h2>
                  {loading ? (
                    <p className="text-gray-600">Loading...</p>
                  ) : pendingStudents.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No pending submissions</p>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {pagedPending.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedStudent(student);
                              setEditableStudent(student);
                            }}
                          >
                            <img
                              src={student.profile_photo_base64 || student.profile_photo_url}
                              alt={student.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800">{student.name}</h3>
                              <p className="text-sm text-gray-600">
                                {student.student_id}
                                {student.blood_group && ` · ${student.blood_group}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {student.submitted_at &&
                                  new Date(student.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-4 text-xs text-gray-600">
                        <button
                          type="button"
                          disabled={pendingPage <= 1}
                          onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span>
                          Page {pendingPage} of {pendingTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={pendingPage >= pendingTotalPages}
                          onClick={() =>
                            setPendingPage((p) => Math.min(pendingTotalPages, p + 1))
                          }
                          className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="text-emerald-600" size={20} />
                    Approved Students
                  </h2>
                  {approvedStudents.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No approved students yet</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {pagedApproved.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center gap-4 p-3 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                            onClick={() => {
                              setSelectedStudent(student);
                              setEditableStudent(student);
                            }}
                          >
                            <img
                              src={student.profile_photo_url || student.profile_photo_base64}
                              alt={student.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-800">{student.name}</h3>
                              <p className="text-sm text-gray-600">
                                {student.student_id}
                                {student.blood_group && ` · ${student.blood_group}`}
                              </p>
                            </div>
                            <div className="flex flex-col items-end text-xs text-gray-500 mr-2">
                              {student.approved_by && <span>Approved by {student.approved_by}</span>}
                              {student.approved_at && (
                                <span>
                                  {new Date(student.approved_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(student);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-4 text-xs text-gray-600">
                        <button
                          type="button"
                          disabled={approvedPage <= 1}
                          onClick={() => setApprovedPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span>
                          Page {approvedPage} of {approvedTotalPages}
                        </span>
                        <button
                          type="button"
                          disabled={approvedPage >= approvedTotalPages}
                          onClick={() =>
                            setApprovedPage((p) => Math.min(approvedTotalPages, p + 1))
                          }
                          className="px-3 py-1 rounded-lg border border-gray-300 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {selectedStudent && editableStudent && (
            <div className="bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 float-left">Review Details</h3>
              <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setEditableStudent(null);
                  }}
                  type="button"
                  className="float-right text-red-500 hover:text-red-700 text-xl font-bold"
                >
                  X
                </button>
              <div className="space-y-4">
                <div>
                  <img
                    src={
                      selectedStudent.profile_photo_base64 ||
                      selectedStudent.profile_photo_url
                    }
                    alt={selectedStudent.name}
                    className="w-full rounded-lg mb-2"
                  />
                  <p className="text-xs text-gray-500 text-center">Profile Photo</p>
                </div>

                <div>
                  <img
                    src={
                      selectedStudent.cover_photo_base64 || selectedStudent.cover_photo_url
                    }
                    alt="Cover"
                    className="w-full rounded-lg mb-2"
                  />
                  <p className="text-xs text-gray-500 text-center">Cover Photo</p>
                </div>
                <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(selectedStudent)}
                      type="button"
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle size={18} />
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedStudent)}
                      type="button"
                      disabled={deleteMutation.isPending}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <Trash2 size={18} />
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editableStudent.name}
                      onChange={(e) =>
                        setEditableStudent({ ...editableStudent, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Student ID
                    </label>
                    <input
                      type="text"
                      value={editableStudent.student_id}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          student_id: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editableStudent.email || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={editableStudent.phone_number || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          phone_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Blood Group
                    </label>
                    <input
                      type="text"
                      value={editableStudent.blood_group || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          blood_group: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Hometown
                    </label>
                    <input
                      type="text"
                      value={editableStudent.hometown || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          hometown: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Permanent Address
                    </label>
                    <input
                      type="text"
                      value={editableStudent.permanent_address || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          permanent_address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Present Address
                    </label>
                    <input
                      type="text"
                      value={editableStudent.present_address || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          present_address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Religion
                    </label>
                    <input
                      type="text"
                      value={editableStudent.religion || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          religion: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Job Designation
                    </label>
                    <input
                      type="text"
                      value={editableStudent.job_designation || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          job_designation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={editableStudent.organization_name || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          organization_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Gender
                    </label>
                    <select
                      value={editableStudent.gender || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          gender: e.target.value,
                        } as Student)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">(unchanged / none)</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      Facebook URL
                    </label>
                    <input
                      type="url"
                      value={editableStudent.facebook_url || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          facebook_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      X / Twitter URL
                    </label>
                    <input
                      type="url"
                      value={editableStudent.twitter_url || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          twitter_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={editableStudent.linkedin_url || ''}
                      onChange={(e) =>
                        setEditableStudent({
                          ...editableStudent,
                          linkedin_url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    {selectedStudent.submit_ip && (
                      <p>
                        <span className="font-semibold">Submit IP:</span>{' '}
                        {selectedStudent.submit_ip}
                      </p>
                    )}
                    {selectedStudent.submit_ip && (
                      <>
                        {ipLoading && <p>Looking up location (geo.js)...</p>}
                        {ipError && <p className="text-red-500">{ipError}</p>}
                        {ipInfo && (
                          <>
                            <p>
                              <span className="font-semibold">Country:</span>{' '}
                              {ipInfo.country} ({ipInfo.country_code})
                            </p>
                            <p>
                              <span className="font-semibold">Region / City:</span>{' '}
                              {ipInfo.region} {ipInfo.city && `· ${ipInfo.city}`}
                            </p>
                            {ipInfo.organization_name && (
                              <p>
                                <span className="font-semibold">Org / ISP:</span>{' '}
                                {ipInfo.organization_name}
                              </p>
                            )}
                            {ipInfo.timezone && (
                              <p>
                                <span className="font-semibold">Timezone:</span>{' '}
                                {ipInfo.timezone}
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {selectedStudent.submitted_at && (
                      <p>
                        <span className="font-semibold">Submitted:</span>{' '}
                        {new Date(selectedStudent.submitted_at).toLocaleString()}
                      </p>
                    )}
                    {selectedStudent.approved_by && (
                      <p>
                        <span className="font-semibold">Approved by:</span>{' '}
                        {selectedStudent.approved_by}
                      </p>
                    )}
                    {selectedStudent.approved_at && (
                      <p>
                        <span className="font-semibold">Approved at:</span>{' '}
                        {new Date(selectedStudent.approved_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <button
                    type="button"
                    ref={saveButtonRef}
                    disabled={updateMutation.isPending}
                    onClick={async () => {
                      if (!supabase || !editableStudent) return;
                      try {
                        await updateMutation.mutateAsync(editableStudent);
                        setMessage({ type: 'success', text: 'Student updated' });
                      } catch {
                        setMessage({ type: 'error', text: 'Failed to update student' });
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                 
                </div>

                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setEditableStudent(null);
                  }}
                  type="button"
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
