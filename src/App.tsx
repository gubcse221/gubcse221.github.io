import { useEffect, useState } from 'react';
import { supabase, Student } from './lib/supabase';
import { Search, Facebook, Linkedin, Mail, Plus, Lock } from 'lucide-react';

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
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          student.student_id.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('authorized', 1)
        .order('student_id', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-500 to-sky-500 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

        <div className="relative z-10 container mx-auto px-4 py-16 text-white">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
              Green University of Bangladesh
            </h1>
            <div className="text-2xl md:text-3xl font-semibold mb-2">
              Computer Science and Engineering
            </div>
            <div className="text-xl md:text-2xl mb-6 text-emerald-100">
              Batch 221
            </div>
            <div className="text-3xl md:text-4xl font-bold italic text-sky-100 mb-2">
              Return 0;
            </div>
            <div className="text-xl md:text-2xl text-emerald-50">
              Graduation Day
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-12 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-full text-gray-800 shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-300 text-lg"
              />
            </div>

            <div className="flex gap-4 justify-center">
              <a
                href="/upload"
                className="inline-flex items-center gap-2 bg-white hover:bg-emerald-50 text-green-600 font-bold px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105"
              >
                <Plus size={20} />
                Submit Information
              </a>
              <a
                href="/admin"
                className="inline-flex items-center gap-2 bg-white hover:bg-sky-50 text-sky-600 font-bold px-8 py-3 rounded-full shadow-lg transition-all transform hover:scale-105"
              >
                <Lock size={20} />
                Admin Panel
              </a>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-2xl text-gray-600">Loading students...</div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-2xl text-gray-600">
            {searchQuery ? 'No students found matching your search.' : 'No students yet.'}
          </div>
        </div>
      ) : (
        <>
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-green-600 to-sky-600 bg-clip-text text-transparent">
              Our Journey Together
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-16">
              {filteredStudents.map((student) => (
                <div
                  key={`cover-${student.id}`}
                  className="aspect-square overflow-hidden rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
                >
                  <img
                    src={student.cover_photo_url}
                    alt={`${student.name} cover`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="container mx-auto px-4 py-12">
            <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-green-600 to-sky-600 bg-clip-text text-transparent">
              Class of 221 - CSE
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="group bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl"
                >
                  <div className="relative h-32 bg-gradient-to-r from-green-500 via-emerald-400 to-sky-400 overflow-hidden">
                    <img
                      src={student.cover_photo_url || student.cover_photo_base64}
                      alt="Cover"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="relative px-6 pb-6">
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                      <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white ring-2 ring-green-200 group-hover:ring-4 group-hover:ring-sky-300 transition-all">
                        <img
                          src={student.profile_photo_url || student.profile_photo_base64}
                          alt={student.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    </div>
                    <div className="pt-20 text-center">
                      <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-2">
                        {student.name}
                      </h3>
                      <p className="text-green-600 font-semibold mb-2 text-sm">
                        {student.student_id}
                      </p>
                      {student.phone_number && (
                        <p className="text-xs text-gray-500 mb-3">
                          {student.phone_number}
                        </p>
                      )}
                      <div className="flex justify-center space-x-4 pt-2 border-t border-gray-100">
                        {student.facebook_url && (
                          <a
                            href={student.facebook_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 hover:scale-110 transition-all mt-2"
                          >
                            <Facebook size={24} />
                          </a>
                        )}
                        {student.twitter_url && (
                          <a
                            href={student.twitter_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:text-sky-700 hover:scale-110 transition-all mt-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                              <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                            </svg>
                          </a>
                        )}
                        {student.linkedin_url && (
                          <a
                            href={student.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-800 hover:scale-110 transition-all mt-2"
                          >
                            <Linkedin size={24} />
                          </a>
                        )}
                        {student.email && (
                          <a
                            href={`mailto:${student.email}`}
                            className="text-gray-600 hover:text-gray-700 hover:scale-110 transition-all mt-2"
                          >
                            <Mail size={24} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <footer className="bg-gradient-to-r from-green-600 via-emerald-500 to-sky-500 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-semibold">
            Forever in our hearts, the memories we made together
          </p>
          <p className="text-emerald-100 mt-2">
            221 CSE - Return 0; Graduation Day
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
