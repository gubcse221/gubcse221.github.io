import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, Student } from './lib/supabase';
import {
  Search,
  Facebook,
  Linkedin,
  Mail,
  Plus,
  ShieldCheck,
  PhoneCall,
  Github,
  UserPlus,
  HeartHandshake,
  Users,
} from 'lucide-react';

type GithubContributor = {
  id: number;
  login: string;
  html_url: string;
  avatar_url: string;
  contributions: number;
};

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FullScreenBorderLoader = () => (
  <div className="fixed inset-0 z-50 pointer-events-none">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    {/* Top and bottom animated borders */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400 animate-pulse" />
    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 animate-pulse" />
    {/* Left and right animated borders */}
    <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-emerald-400 via-sky-400 to-emerald-400 animate-pulse" />
    <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-sky-400 via-emerald-400 to-sky-400 animate-pulse" />
    {/* Center spinner */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          aria-label="Loading"
          className="h-14 w-14 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin"
        />
        <p className="text-sm font-medium text-emerald-100 tracking-wide uppercase">
          Loading students...
        </p>
      </div>
    </div>
  </div>
);

const PAGE_SIZE = 8;

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [contributors, setContributors] = useState<GithubContributor[]>([]);
  const [dataMode, setDataMode] = useState<'online' | 'offline'>(
    isSupabaseConfigured ? 'online' : 'offline'
  );
  const [offlineReason, setOfflineReason] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabase not configured'
  );

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  // Ref for scroll event
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const localStudentsCacheRef = useRef<Student[] | null>(null);

  // Fetch initial students and reset on search
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setStudents([]);
    setFilteredStudents([]);
    setLoading(true);
    fetchStudents(1, searchQuery.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Infinite Scroll: Attach scroll listener
  useEffect(() => {
    function handleScroll() {
      if (fetchingMore || loading || !hasMore) return;
      if (!loaderRef.current) return;

      const loader = loaderRef.current.getBoundingClientRect();

      // If loader is close to bottom of window
      if (loader.top <= window.innerHeight + 100) {
        // load next page
        fetchMoreStudents();
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchingMore, loading, hasMore, students, searchQuery]);

  // Fetch students with optional search, page
  const fetchStudents = useCallback(async (pageNum: number, query: string) => {
    let usedOffline = false;
    const loadFromLocal = async () => {
      usedOffline = true;
      let localStudents: Student[] = localStudentsCacheRef.current || [];
      if (!localStudentsCacheRef.current) {
        try {
          const mod = await import('./data/students.json');
          const raw = (mod as any).default ?? mod;
          const extracted = (raw?.students ?? raw) as Student[];
          localStudents = Array.isArray(extracted) ? extracted : [];
          localStudentsCacheRef.current = localStudents;
        } catch {
          localStudents = [];
        }
      }

      const all = (localStudents || [])
        .filter((s) => (s as any).authorized === 1 || (s as any).authorized === true)
        .slice()
        .sort((a, b) => String(a.student_id).localeCompare(String(b.student_id)));

      const q = query.trim().toLowerCase();
      const filtered = q
        ? all.filter(
            (s) =>
              String(s.name || '').toLowerCase().includes(q) ||
              String(s.student_id || '').toLowerCase().includes(q)
          )
        : all;

      // Offline mode: load all matching students at once (no pagination)
      setStudents(filtered);
      setFilteredStudents(filtered);
      setHasMore(false);

      setLoading(false);
      setFetchingMore(false);
      setDataMode('offline');
    };

    if (!supabase || !isSupabaseConfigured) {
      setOfflineReason('Supabase not configured');
      await loadFromLocal();
      return;
    }
    try {
      setLoading(true);
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Base request for authorized students ordered by student_id
      let request = supabase
        .from('students')
        .select('*')
        .eq('authorized', 1)
        .order('student_id', { ascending: true });

      // If no search query, use paginated range; if searching, fetch all and filter client-side
      if (!query) {
        request = request.range(from, to);
      }

      const { data, error } = await request;
      if (error) throw error;

      // Only client-side filter (as above), since .ilike is not used for cross-fields on Supabase free tier
      let pageFiltered = data || [];
      if (query) {
        const q = query.toLowerCase();
        pageFiltered = pageFiltered.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.student_id.toLowerCase().includes(q)
        );
      }

      if (pageNum === 1) {
        setStudents(pageFiltered);
        setFilteredStudents(pageFiltered);
      } else {
        setStudents((prev) => [...prev, ...pageFiltered]);
        setFilteredStudents((prev) => [...prev, ...pageFiltered]);
      }

      // When searching, we fetched all authorized students in one go, so disable "load more"
      if (query) {
        setHasMore(false);
      } else {
        setHasMore(pageFiltered.length === PAGE_SIZE);
      }
      setDataMode('online');
      setOfflineReason(null);
    } catch (e) {
      console.error('Error fetching students:', e);
      setOfflineReason('Could not reach Supabase (showing offline data)');
      await loadFromLocal();
    } finally {
      // loadFromLocal() already clears these when offline
      if (!usedOffline) {
        setLoading(false);
        setFetchingMore(false);
      }
    }
  }, []);

  // Function to fetch more students (pagination)
  const fetchMoreStudents = useCallback(() => {
    if (fetchingMore || loading || !hasMore) return;
    setFetchingMore(true);
    const nextPage = page + 1;
    fetchStudents(nextPage, searchQuery.trim());
    setPage(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchingMore, loading, hasMore, page, searchQuery, fetchStudents]);

  // Fetch GitHub contributors for footer
  useEffect(() => {
    let isMounted = true;

    async function fetchContributors() {
      try {
        const response = await fetch(
          'https://api.github.com/repos/gubcse221/gubcse221.github.io/contributors'
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = (await response.json()) as GithubContributor[];
        if (isMounted && Array.isArray(data)) {
          setContributors(data);
        }
      } catch (error) {
        console.error('Error fetching GitHub contributors:', error);
      }
    }

    fetchContributors();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtering is handled at fetch time above (to keep pagination consistent)
  // This effect is now unnecessary, filtering is managed via fetchStudents
  // (Remove the old filtering useEffect)

  const heroBg = 'url(/assets/cover.JPG)';
  const pageBg = 'url(/assets/bg.png)';

  return (
    <div
      className="min-h-screen bg-gray-900 relative"
      style={{
        backgroundImage: pageBg,
        backgroundSize: '160px 160px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-black/60 -z-10" />

      {loading && students.length === 0 && <FullScreenBorderLoader />}
      {/* Single cover from public/assets (or first student cover) as background */}
      <header
        className="relative min-h-[70vh] flex flex-col justify-end bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            heroBg ||
            'radial-gradient(circle at top left, #22c55e 0%, #0ea5e9 40%, #1e293b 100%)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-slate-950/70 to-black/80 backdrop-blur-[2px]" />
        <div className="absolute top-4 right-4 z-20 flex flex-wrap gap-2">
          <a
            href="/upload"
            className="inline-flex items-center gap-1.5 bg-emerald-400/95 text-emerald-950 font-semibold text-sm px-3 py-1.5 rounded-full hover:bg-emerald-300 transition-colors shadow-lg"
          >
            <UserPlus size={14} />
            Submit info
          </a>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 bg-slate-900/80 text-sky-200 font-semibold text-sm px-3 py-1.5 rounded-full hover:bg-slate-900 transition-colors shadow-lg border border-sky-400/50"
          >
            <ShieldCheck size={14} />
            Admin
          </a>
        </div>
        <div className="relative z-10 container mx-auto px-4 py-12 text-white">
          <div className="flex flex-wrap items-center gap-4 mb-6 animate-fade-in-up">
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
          <h1 className="text-4xl md:text-6xl font-extrabold mb-2 drop-shadow-[0_12px_40px_rgba(15,23,42,0.95)] tracking-tight animate-fade-in-up">
            Green University of Bangladesh
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-1 animate-fade-in-up">
            Computer Science and Engineering · Batch 221
          </p>
          <p className="text-2xl md:text-3xl font-semibold italic text-emerald-200 animate-fade-in-up">
            Return 0; — Graduation Day
          </p>

          <form
            className="mt-8 max-w-xl animate-fade-in-up"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQuery(searchInput.trim());
            }}
          >

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-24 py-3 rounded-2xl bg-white/95/90 text-gray-900 placeholder-gray-500 shadow-[0_18px_45px_rgba(15,23,42,0.65)] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-900/60"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-900/60"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </header>

      {dataMode === 'offline' && (
        <div className="container mx-auto px-4 py-4 text-center">
          <div className="inline-block bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm border border-amber-200">
            Showing offline data from <span className="font-semibold">students.json</span>.
            {offlineReason ? ` (${offlineReason})` : ''}
          </div>
        </div>
      )}

      {loading && students.length === 0 ? (
        <div className="container mx-auto px-4 py-16 text-center text-gray-600">
          Loading students...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="container mx-auto px-4 py-16 text-center text-gray-600">
          {searchQuery ? 'No students found.' : 'No students yet.'}
        </div>
      ) : (
        <main className="container mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-green-700 text-center mb-6 sm:mb-8 drop-shadow-lg">
            Batch of 221 — CSE Directory
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filteredStudents.map((student) => {
              const cover =
                student.cover_photo_url ||
                student.cover_photo_base64 ||
                '/assets/cover.JPG';

              return (
                <article
                  key={student.id}
                  className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 border border-emerald-500/15 bg-slate-900/80 glass-panel animate-fade-in-up"
                >
                  {/* Cover banner with gradient overlay */}
                  <div
                    className="relative h-28 sm:h-36 bg-cover bg-center"
                    style={{ backgroundImage: `url(${cover})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/80" />
                  </div>

                  {/* Profile photo - overlapping cover and content, larger circle */}
                  <div className="relative flex justify-center -mt-16 sm:-mt-20">
                    <div className="rounded-full p-2 sm:p-2.5 bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg">
                      <img
                        src={student.profile_photo_url || student.profile_photo_base64}
                        alt={student.name}
                        className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover bg-gray-100 ring-2 ring-white"
                      />
                    </div>
                  </div>

                  {/* Content section */}
                  <div className="px-4 sm:px-5 pb-4 sm:pb-6 pt-1 sm:pt-2 text-center">
                    <h3 className="font-semibold text-slate-50 text-base sm:text-lg leading-tight mb-0.5 tracking-tight break-words">
                      {student.name}
                    </h3>
                    <p className="text-emerald-300 font-medium text-xs sm:text-sm">
                      {student.student_id}
                    </p>
                    {student.blood_group && (
                      <p className="text-rose-300 font-medium text-[11px] sm:text-xs mb-3">
                        Blood group: {student.blood_group}
                      </p>
                    )}
                    {!student.blood_group && <div className="mb-4 sm:mb-5" />}

                    {/* Social links - modern circular icon buttons */}
                    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                      {student.phone_number && (
                        <a
                          href={`tel:${student.phone_number.replace(/\D/g, '')}`}
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center hover:bg-emerald-400/30 hover:text-emerald-50 hover:-translate-y-0.5 transition-all duration-150"
                          title="Call"
                        >
                          <PhoneCall size={18} />
                        </a>
                      )}
                      {student.email && (
                        <a
                          href={`mailto:${student.email}`}
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/40 flex items-center justify-center hover:bg-amber-400/30 hover:text-amber-50 hover:-translate-y-0.5 transition-all duration-150"
                          title="Email"
                        >
                          <Mail size={18} />
                        </a>
                      )}
                      {student.facebook_url && (
                        <a
                          href={student.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/50 flex items-center justify-center hover:bg-sky-500/40 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                          title="Facebook"
                        >
                          <Facebook size={18} />
                        </a>
                      )}
                      {student.twitter_url && (
                        <a
                          href={student.twitter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-200/10 text-slate-100 border border-slate-300/40 flex items-center justify-center hover:bg-slate-100/20 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                          title="X (Twitter)"
                        >
                          <XIcon />
                        </a>
                      )}
                      {student.linkedin_url && (
                        <a
                          href={student.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-sky-600/20 text-sky-200 border border-sky-500/60 flex items-center justify-center hover:bg-sky-600/40 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                          title="LinkedIn"
                        >
                          <Linkedin size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div ref={loaderRef} className="w-full flex justify-center py-5">
            {fetchingMore && (
              <div className="text-gray-500">Loading more...</div>
            )}
            {!hasMore && !loading && (
              <div className="text-gray-400 text-sm">No more students.</div>
            )}
          </div>
        </main>
      )}

      <footer className="bg-gray-800/95 text-white py-8 mt-12 border-t border-gray-700/60">
        <div className="container mx-auto px-4 text-center space-y-3">
          <div>
            <p className="font-medium inline-flex items-center justify-center gap-2 text-sm sm:text-base">
              <HeartHandshake className="text-emerald-300" size={16} />
              <span>Forever in our hearts — the memories we made together</span>
            </p>
            <p className="text-gray-400 mt-1 text-xs sm:text-sm">221 CSE · Return 0; Graduation Day</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-300">
            <a
              href="https://github.com/gubcse221/gubcse221.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/70 hover:bg-gray-700/90 border border-gray-700/80 transition-colors"
            >
              <Github size={16} />
              <span className="font-medium">View on GitHub</span>
            </a>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                  dataMode === 'online'
                    ? 'bg-emerald-400/15 text-emerald-100 border-emerald-300/40'
                    : 'bg-amber-400/15 text-amber-100 border-amber-300/40'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    dataMode === 'online' ? 'bg-emerald-300' : 'bg-amber-300'
                  }`}
                />
                {dataMode === 'online' ? 'Online (Supabase)' : 'Offline (local JSON)'}
              </span>
              {dataMode === 'offline' && offlineReason && (
                <span className="text-xs text-white/80">{offlineReason}</span>
              )}
            </div>
          </div>
          {contributors.length > 0 && (
            <div className="mt-3 space-y-2 text-xs text-gray-300">
              <p className="flex items-center justify-center gap-1 text-[11px] sm:text-xs text-gray-400">
                <Users size={14} />
                <span>GitHub contributors</span>
              </p>
              <div className="flex items-center justify-center gap-2">
                {contributors.slice(0, 8).map((contributor) => (
                  <a
                    key={contributor.id}
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full overflow-hidden border border-gray-600 bg-gray-900/80 hover:border-emerald-400 hover:-translate-y-0.5 transition-transform transition-colors duration-150"
                    title={contributor.login}
                  >
                    <img
                      src={contributor.avatar_url}
                      alt={contributor.login}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}

                {contributors.length > 8 && (
                  <a
                    href="https://github.com/gubcse221/gubcse221.github.io/graphs/contributors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-gray-600 bg-gray-900/80 text-gray-200 hover:bg-gray-700 hover:-translate-y-0.5 transition-transform transition-colors duration-150"
                    title="View all contributors"
                  >
                    <Plus size={16} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
