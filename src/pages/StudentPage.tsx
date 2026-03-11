import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured, Student } from '../lib/supabase';
import { Facebook, Linkedin, Mail, PhoneCall, XIcon } from 'lucide-react';

async function loadStudentFromJson(studentId: string): Promise<Student | null> {
  try {
    let mod: any;
    try {
      mod = await import('../data/students.json');
    } catch {
      const resp = await fetch('../data/students.json');
      if (!resp.ok) return null;
      mod = await resp.json();
    }
    const raw = mod.default ?? mod;
    const students = (raw.students ?? raw) as Student[];
    if (!Array.isArray(students)) return null;
    return (
      students.find(
        (s) =>
          String((s as any).student_id) === String(studentId) &&
          ((s as any).authorized === 1 || (s as any).authorized === true)
      ) || null
    );
  } catch {
    return null;
  }
}

export default function StudentPage() {
  const { student_id } = useParams<{ student_id: string }>();

  const { data, isLoading, isError } = useQuery<Student | null>({
    queryKey: ['student', student_id],
    enabled: Boolean(student_id),
    queryFn: async () => {
      const id = student_id!;

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('student_id', id)
          .eq('authorized', 1)
          .maybeSingle();
        if (error) throw error;
        if (data) return data as Student;
      }

      return await loadStudentFromJson(id);
    },
    staleTime: 1000 * 30,
  });

  if (!student_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Invalid student id.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Loading profile...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white px-4">
        <p className="mb-4">Profile not found or not authorized.</p>
        <Link
          to="/"
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm font-semibold"
        >
          Back to directory
        </Link>
      </div>
    );
  }

  const student = data;
  const cover =
    student.cover_photo_url || student.cover_photo_base64 || '/assets/cover.JPG';
  const profile = student.profile_photo_url || student.profile_photo_base64;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Cover Photo & Back Button */}
      <div className="relative h-60 sm:h-72 bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/90" />
        <div className="relative z-10 container mx-auto px-4 pt-4 flex justify-between items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-emerald-200 hover:text-emerald-100 text-sm font-semibold"
          >
            <span className="inline-block h-5 w-5 rounded-full bg-emerald-400/20 border border-emerald-300/60 flex items-center justify-center">
              ‹
            </span>
            Back to Directory
          </Link>
        </div>
        <div className="relative z-10 container mx-auto px-4 pb-4 flex flex-col items-center">
          <div className="-mb-16">
            <div className="rounded-full p-2.5 bg-gradient-to-br from-emerald-400 to-teal-600 shadow-xl">
              {profile && (
                <img
                  src={profile}
                  alt={student.name}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover bg-gray-100 ring-2 ring-white"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="container mx-auto px-4 pb-10 pt-20 grid gap-8 lg:grid-cols-[2fr,1.4fr]">
        <section className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-5 sm:p-6 shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-emerald-200">
            {student.name}
          </h1>
          <p className="text-sm sm:text-base text-emerald-300 mb-4">
            ID: <span className="font-semibold">{student.student_id}</span>
          </p>
          {/* Contact and Info */}
          <div className="grid gap-3 text-sm sm:text-base">
            {student.email && (
              <p>
                <span className="text-slate-300 font-semibold">Email: </span>
                <a href={`mailto:${student.email}`} className="text-emerald-300 hover:underline">
                  {student.email}
                </a>
              </p>
            )}
            {student.phone_number && (
              <p>
                <span className="text-slate-300 font-semibold">Phone: </span>
                <a
                  href={`tel:${student.phone_number.replace(/\D/g, '')}`}
                  className="text-emerald-300 hover:underline"
                >
                  {student.phone_number}
                </a>
              </p>
            )}
            {student.blood_group && (
              <p>
                <span className="text-slate-300 font-semibold">Blood group: </span>
                <span className="text-rose-300">{student.blood_group}</span>
              </p>
            )}
            {student.gender && (
              <p>
                <span className="text-slate-300 font-semibold">Gender: </span>
                <span>{student.gender}</span>
              </p>
            )}

            <hr className="border-slate-600/40 my-2" />

            {/* Full Profile Details: */}
            {student.hometown && (
              <p>
                <span className="text-slate-300 font-semibold">Hometown: </span>
                <span>{student.hometown}</span>
              </p>
            )}
            {student.present_address && (
              <p>
                <span className="text-slate-300 font-semibold">Present address: </span>
                <span>{student.present_address}</span>
              </p>
            )}
            {student.permanent_address && (
              <p>
                <span className="text-slate-300 font-semibold">Permanent address: </span>
                <span>{student.permanent_address}</span>
              </p>
            )}
            {student.religion && (
              <p>
                <span className="text-slate-300 font-semibold">Religion: </span>
                <span>{student.religion}</span>
              </p>
            )}
            {(student.organization_name || student.job_designation) && (
              <p>
                <span className="text-slate-300 font-semibold">Work: </span>
                <span>
                  {student.job_designation
                    ? `${student.job_designation}${student.organization_name ? `, ${student.organization_name}` : ''}`
                    : student.organization_name}
                </span>
              </p>
            )}
            {/* Add more fields here as they become available in your schema */}
          </div>
          {/* Optional: show all available fields in a detail block */}
          <div className="mt-6 bg-slate-800/60 rounded-xl p-4 text-xs text-slate-300">
            <h3 className="text-slate-400 text-sm font-bold mb-2">Full Information</h3>
            <table className="w-full">
              <tbody>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Name:</td>
                  <td className="py-1">{student.name || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Student ID:</td>
                  <td className="py-1">{student.student_id || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Email:</td>
                  <td className="py-1">{student.email || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Phone Number:</td>
                  <td className="py-1">{student.phone_number || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Blood Group:</td>
                  <td className="py-1">{student.blood_group || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Gender:</td>
                  <td className="py-1">{student.gender || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Hometown:</td>
                  <td className="py-1">{student.hometown || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Present address:</td>
                  <td className="py-1">{student.present_address || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Permanent address:</td>
                  <td className="py-1">{student.permanent_address || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Religion:</td>
                  <td className="py-1">{student.religion || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Job Designation:</td>
                  <td className="py-1">{student.job_designation || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Organization Name:</td>
                  <td className="py-1">{student.organization_name || '-'}</td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">Facebook URL:</td>
                  <td className="py-1">
                    {student.facebook_url ? (
                      <a
                        href={student.facebook_url}
                        className="text-sky-200 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {student.facebook_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">X.com (Twitter) URL:</td>
                  <td className="py-1">
                    {student.twitter_url ? (
                      <a
                        href={student.twitter_url}
                        className="text-sky-200 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {student.twitter_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="pr-2 py-1 align-top font-semibold">LinkedIn URL:</td>
                  <td className="py-1">
                    {student.linkedin_url ? (
                      <a
                        href={student.linkedin_url}
                        className="text-sky-200 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {student.linkedin_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
                {/* Add more fields as desired */}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact & Social Links */}
        <aside className="space-y-4">
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">
              Contact & Social Links
            </h2>
            <div className="flex flex-wrap gap-2">
              {student.phone_number && (
                <a
                  href={`tel:${student.phone_number.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-xs sm:text-sm"
                >
                  <PhoneCall size={14} />
                  Call
                </a>
              )}
              {student.email && (
                <a
                  href={`mailto:${student.email}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-xs sm:text-sm"
                >
                  <Mail size={14} />
                  Email
                </a>
              )}
              {student.facebook_url && (
                <a
                  href={student.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/50 text-xs sm:text-sm"
                >
                  <Facebook size={14} />
                  Facebook
                </a>
              )}
               {student.twitter_url && (
                <a
                  href={student.twitter_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/50 text-xs sm:text-sm"
                >
                  <XIcon size={14} />
                  X.com (Twitter)
                  </a>
              )}
              {student.linkedin_url && (
                <a
                  href={student.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600/20 text-sky-200 border border-sky-500/60 text-xs sm:text-sm"
                >
                  <Linkedin size={14} />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

