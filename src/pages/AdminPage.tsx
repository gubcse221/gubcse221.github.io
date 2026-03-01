import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, Student } from '../lib/supabase';
import { CheckCircle, XCircle, Trash2, LogOut } from 'lucide-react';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.trim(); // Optional: only this email can access admin

export default function AdminPage() {
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    if (authenticated) {
      fetchStudents();
    }
  }, [authenticated]);

  const fetchStudents = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data: pending } = await supabase
        .from('students')
        .select('*')
        .eq('authorized', 0)
        .order('submitted_at', { ascending: false });

      const { data: approved } = await supabase
        .from('students')
        .select('*')
        .eq('authorized', 1)
        .order('student_id', { ascending: true });

      setPendingStudents(pending || []);
      setApprovedStudents(approved || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (student: Student) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('students')
        .update({
          authorized: 1,
          profile_photo_url: student.profile_photo_base64 || student.profile_photo_url,
          cover_photo_url: student.cover_photo_base64 || student.cover_photo_url,
        })
        .eq('id', student.id);

      if (error) throw error;

      setMessage({ type: 'success', text: `${student.name} approved!` });
      setSelectedStudent(null);
      fetchStudents();

      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to approve student' });
    }
  };

  const handleDelete = async (student: Student) => {
    if (!supabase) return;
    if (!window.confirm(`Delete ${student.name} (${student.student_id})? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', student.id);

      if (error) throw error;

      setMessage({ type: 'success', text: `${student.name} removed` });
      setSelectedStudent(null);
      fetchStudents();

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
    setMessage({ type: 'success', text: 'Signed out' });
    setTimeout(() => setMessage(null), 2000);
  };

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
          <p className="text-gray-600 mb-6">Sign in with your Supabase account</p>

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
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Pending Approvals ({pendingStudents.length})
              </h2>

              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : pendingStudents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending submissions</p>
              ) : (
                <div className="space-y-4">
                  {pendingStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <img
                        src={student.profile_photo_base64 || student.profile_photo_url}
                        alt={student.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.student_id}</p>
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
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="text-emerald-600" size={24} />
                Approved Students ({approvedStudents.length})
              </h2>

              {approvedStudents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No approved students yet</p>
              ) : (
                <div className="space-y-3">
                  {approvedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center gap-4 p-3 bg-emerald-50 rounded-lg"
                    >
                      <img
                        src={student.profile_photo_url || student.profile_photo_base64}
                        alt={student.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.student_id}</p>
                      </div>
                      <CheckCircle className="text-emerald-600 shrink-0" size={20} />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(student); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedStudent && (
            <div className="bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Review Details</h3>

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

                <div className="border-t pt-4 space-y-2">
                  <p>
                    <span className="font-semibold text-gray-700">Name:</span>{' '}
                    {selectedStudent.name}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">ID:</span>{' '}
                    {selectedStudent.student_id}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Email:</span>{' '}
                    {selectedStudent.email}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700">Phone:</span>{' '}
                    {selectedStudent.phone_number}
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleApprove(selectedStudent)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>
                  <button
                    onClick={() => handleDelete(selectedStudent)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>

                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition-colors"
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
