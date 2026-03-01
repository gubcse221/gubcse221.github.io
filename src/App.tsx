import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, Student } from './lib/supabase';
import { Search, Facebook, Linkedin, Mail, Plus, Lock, Phone } from 'lucide-react';

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) => s.name.toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('authorized', 1)
        .order('student_id', { ascending: true });
      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (e) {
      console.error('Error fetching students:', e);
    } finally {
      setLoading(false);
    }
  };

  const heroCover =
    students.length > 0
      ? students[0].cover_photo_url || students[0].cover_photo_base64
      : null;
  const heroBg = heroCover ? `url(${heroCover})` : 'url(/assets/cover.JPG)';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Single cover from public/assets (or first student cover) as background */}
      <header
        className="relative min-h-[70vh] flex flex-col justify-end bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: heroBg || 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute top-4 right-4 z-20 flex flex-wrap gap-2">
          <a
            href="/upload"
            className="inline-flex items-center gap-1.5 bg-white text-green-700 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors shadow-lg"
          >
            <Plus size={14} />
            Submit Information
          </a>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 bg-white/90 text-sky-700 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-sky-50 transition-colors shadow-lg"
          >
            <Lock size={14} />
            Admin
          </a>
        </div>
        <div className="relative z-10 container mx-auto px-4 py-12 text-white">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <img
              src="/assets/green-logo.png"
              alt="GUB"
              className="h-16 w-auto object-contain drop-shadow-md"
            />
            <img
              src="/assets/department-logo.jpg"
              alt="CSE"
              className="h-14 w-auto object-contain rounded-lg drop-shadow-md"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-2 drop-shadow-lg">
            Green University of Bangladesh
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-1">
            Computer Science and Engineering · Batch 221
          </p>
          <p className="text-2xl md:text-3xl font-semibold italic text-emerald-200">
            Return 0; — Graduation Day
          </p>

          <div className="mt-8 max-w-xl">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>
      </header>

      {!isSupabaseConfigured && (
        <div className="container mx-auto px-4 py-4 text-center">
          <div className="inline-block bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm border border-amber-200">
            Database not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load data.
          </div>
        </div>
      )}

      {loading ? (
        <div className="container mx-auto px-4 py-16 text-center text-gray-600">
          Loading students...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="container mx-auto px-4 py-16 text-center text-gray-600">
          {searchQuery ? 'No students found.' : 'No students yet.'}
        </div>
      ) : (
        <main className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">
            Class of 221 — CSE
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudents.map((student) => (
              <article
                key={student.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6 flex flex-col items-center text-center">
                  <img
                    src={student.profile_photo_url || student.profile_photo_base64}
                    alt={student.name}
                    className="w-28 h-28 rounded-full object-cover border-4 border-emerald-100 mb-3"
                  />
                  <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">
                    {student.name}
                  </h3>
                  <p className="text-emerald-600 font-semibold text-sm mb-4">
                    {student.student_id}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {student.phone_number && (
                      <a
                        href={`tel:${student.phone_number.replace(/\D/g, '')}`}
                        className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                        title="Call"
                      >
                        <Phone size={20} />
                      </a>
                    )}
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                        title="Email"
                      >
                        <Mail size={20} />
                      </a>
                    )}
                    {student.facebook_url && (
                      <a
                        href={student.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-100 text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Facebook"
                      >
                        <Facebook size={20} />
                      </a>
                    )}
                    {student.twitter_url && (
                      <a
                        href={student.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                        title="X"
                      >
                        <XIcon />
                      </a>
                    )}
                    {student.linkedin_url && (
                      <a
                        href={student.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-100 text-blue-700 hover:bg-blue-50 transition-colors"
                        title="LinkedIn"
                      >
                        <Linkedin size={20} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>
      )}

      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="font-medium">Forever in our hearts — the memories we made together</p>
          <p className="text-gray-400 mt-1">221 CSE · Return 0; Graduation Day</p>
        </div>
      </footer>
    </div>
  );
}

export default App;



