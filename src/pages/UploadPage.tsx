import { useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressImage, formatFileSize, getBase64Size } from '../lib/imageUtils';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Cropper } from 'react-cropper';
import 'cropperjs/dist/cropper.css';

export default function UploadPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    student_id: '',
    email: '',
    facebook_url: '',
    twitter_url: '',
    linkedin_url: '',
    blood_group: '',
    gender: '',
    hometown: '',
    permanent_address: '',
    present_address: '',
    religion: '',
    job_designation: '',
    organization_name: '',
  });

  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [coverPhoto, setCoverPhoto] = useState<string>('');

  const [cropMode, setCropMode] = useState<'profile' | 'cover' | null>(null);
  const cropperRef = useRef<any>(null);

  // Responsive crop container sizing is now handled by Cropper.js

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitIp, setSubmitIp] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profile' | 'cover'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 10MB' });
      return;
    }

    try {
      const compressed = await compressImage(file, 1);
      console.log(compressed);

      if (type === 'profile') {
        setProfilePhoto(compressed);
        setCropMode('profile');
      } else {
        setCoverPhoto(compressed);
        setCropMode('cover');
      }
      setMessage(null);
    } catch {
      setMessage({ type: 'error', text: 'Failed to process image' });
    }
  };

  const applyCrop = async () => {
    if (!cropMode) return;

    try {
      const imageElement = cropperRef.current;
      const cropper = imageElement?.cropper;
      if (!cropper) return;

      const canvas = cropper.getCroppedCanvas();
      if (!canvas) return;

      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);

      if (cropMode === 'profile') {
        setProfilePhoto(croppedBase64);
      } else {
        setCoverPhoto(croppedBase64);
      }

      setCropMode(null);
      setMessage({ type: 'success', text: 'Image cropped successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to crop image' });
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.student_id.trim()) return 'Student ID is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phone_number.trim()) return 'Phone number is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!/^\d{10,}$/.test(formData.phone_number.replace(/\D/g, ''))) {
      return 'Phone number must have at least 10 digits';
    }
    if (!profilePhoto) return 'Profile photo is required';
    if (!coverPhoto) return 'Cover photo is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }

    if (!termsAccepted) {
      setMessage({
        type: 'error',
        text: 'You must confirm that your information will be public and that you are a GUB CSE 221 student.',
      });
      return;
    }

    if (!supabase) {
      setMessage({ type: 'error', text: 'Database not configured.' });
      return;
    }

    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', formData.student_id)
        .maybeSingle();

      // Best-effort: capture public IP for auditing
      let ipToStore: string | null = submitIp;
      if (!ipToStore) {
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          if (res.ok) {
            const json = await res.json();
            ipToStore = json.ip ?? null;
            setSubmitIp(ipToStore);
          }
        } catch {
          ipToStore = null;
        }
      }

      const payload = {
        name: formData.name,
        phone_number: formData.phone_number,
        student_id: formData.student_id,
        email: formData.email,
        facebook_url: formData.facebook_url || null,
        twitter_url: formData.twitter_url || null,
        linkedin_url: formData.linkedin_url || null,
        blood_group: formData.blood_group || null,
        gender: formData.gender || null,
        hometown: formData.hometown || null,
        permanent_address: formData.permanent_address || null,
        present_address: formData.present_address || null,
        religion: formData.religion || null,
        job_designation: formData.job_designation || null,
        organization_name: formData.organization_name || null,
        profile_photo_base64: profilePhoto,
        cover_photo_base64: coverPhoto,
        profile_photo_url: '',
        cover_photo_url: '',
        authorized: 0,
        submitted_at: new Date().toISOString(),
        submit_ip: ipToStore,
      };

      let dbError = null;

      if (existing) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', existing.id);
        dbError = error;
      } else {
        const { error } = await supabase.from('students').insert([payload]);
        dbError = error;
      }

      if (dbError) throw dbError;

      setMessage({
        type: 'success',
        text:
          'Your information has been submitted successfully. After an admin verifies your details, ' +
          'your profile will be visible in the public directory.',
      });

      setFormData({
        name: '',
        phone_number: '',
        student_id: '',
        email: '',
        facebook_url: '',
        twitter_url: '',
        linkedin_url: '',
        blood_group: '',
        gender: '',
        hometown: '',
        permanent_address: '',
        present_address: '',
        religion: '',
        job_designation: '',
        organization_name: '',
      });
      setProfilePhoto('');
      setCoverPhoto('');

      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to submit information',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-sky-50 to-teal-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Directory
          </a>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-sky-500 px-8 py-12">
              <h1 className="text-4xl font-bold text-white mb-2">Submit Your Information</h1>
              <p className="text-emerald-100 text-lg">
                Share your details and photos to join the memorial directory
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mx-6 mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                Database not configured. Submissions are disabled.
              </div>
            )}

            {message && (
              <div
                className={`mx-6 mt-6 p-4 rounded-xl flex items-start gap-3 ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                )}
                <p
                  className={
                    message.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                  }
                >
                  {message.text}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Md. Abdur Rahim Sarkar"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Student ID
                  </label>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    placeholder="221902011"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="+88 01234 567890"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hometown (District)
                  </label>
                  <select
                    name="hometown"
                    value={formData.hometown}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select district</option>
                    <option value="Barguna">Barguna</option>
                    <option value="Barishal">Barishal</option>
                    <option value="Bhola">Bhola</option>
                    <option value="Jhalokati">Jhalokati</option>
                    <option value="Patuakhali">Patuakhali</option>
                    <option value="Pirojpur">Pirojpur</option>
                    <option value="Bandarban">Bandarban</option>
                    <option value="Brahmanbaria">Brahmanbaria</option>
                    <option value="Chandpur">Chandpur</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Cumilla">Cumilla</option>
                    <option value="Cox's Bazar">Cox's Bazar</option>
                    <option value="Feni">Feni</option>
                    <option value="Khagrachhari">Khagrachhari</option>
                    <option value="Lakshmipur">Lakshmipur</option>
                    <option value="Noakhali">Noakhali</option>
                    <option value="Rangamati">Rangamati</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Faridpur">Faridpur</option>
                    <option value="Gazipur">Gazipur</option>
                    <option value="Gopalganj">Gopalganj</option>
                    <option value="Kishoreganj">Kishoreganj</option>
                    <option value="Madaripur">Madaripur</option>
                    <option value="Manikganj">Manikganj</option>
                    <option value="Munshiganj">Munshiganj</option>
                    <option value="Narayanganj">Narayanganj</option>
                    <option value="Narsingdi">Narsingdi</option>
                    <option value="Rajbari">Rajbari</option>
                    <option value="Shariatpur">Shariatpur</option>
                    <option value="Tangail">Tangail</option>
                    <option value="Bagerhat">Bagerhat</option>
                    <option value="Chuadanga">Chuadanga</option>
                    <option value="Jashore">Jashore</option>
                    <option value="Jhenaidah">Jhenaidah</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Kushtia">Kushtia</option>
                    <option value="Magura">Magura</option>
                    <option value="Meherpur">Meherpur</option>
                    <option value="Narail">Narail</option>
                    <option value="Satkhira">Satkhira</option>
                    <option value="Jamalpur">Jamalpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                    <option value="Netrakona">Netrakona</option>
                    <option value="Sherpur">Sherpur</option>
                    <option value="Bogura">Bogura</option>
                    <option value="Joypurhat">Joypurhat</option>
                    <option value="Naogaon">Naogaon</option>
                    <option value="Natore">Natore</option>
                    <option value="Chapainawabganj">Chapainawabganj</option>
                    <option value="Pabna">Pabna</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Sirajganj">Sirajganj</option>
                    <option value="Dinajpur">Dinajpur</option>
                    <option value="Gaibandha">Gaibandha</option>
                    <option value="Kurigram">Kurigram</option>
                    <option value="Lalmonirhat">Lalmonirhat</option>
                    <option value="Nilphamari">Nilphamari</option>
                    <option value="Panchagarh">Panchagarh</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Thakurgaon">Thakurgaon</option>
                    <option value="Habiganj">Habiganj</option>
                    <option value="Moulvibazar">Moulvibazar</option>
                    <option value="Sunamganj">Sunamganj</option>
                    <option value="Sylhet">Sylhet</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Permanent Address
                  </label>
                  <input
                    type="text"
                    name="permanent_address"
                    value={formData.permanent_address}
                    onChange={handleInputChange}
                    placeholder="Village/Area, Post, Thana, District"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Present Address
                  </label>
                  <input
                    type="text"
                    name="present_address"
                    value={formData.present_address}
                    onChange={handleInputChange}
                    placeholder="Current living address"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    name="organization_name"
                    value={formData.organization_name}
                    onChange={handleInputChange}
                    placeholder="Company / University / Organization"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Designation
                  </label>
                  <input
                    type="text"
                    name="job_designation"
                    value={formData.job_designation}
                    onChange={handleInputChange}
                    placeholder="Software Engineer, Lecturer, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Religion
                  </label>
                  <select
                    name="religion"
                    value={formData.religion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select religion</option>
                    <option value="Islam">Islam</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Social Media Links</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    name="facebook_url"
                    value={formData.facebook_url}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    X.com (Twitter) URL
                  </label>
                  <input
                    type="url"
                    name="twitter_url"
                    value={formData.twitter_url}
                    onChange={handleInputChange}
                    placeholder="https://x.com/username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    name="linkedin_url"
                    value={formData.linkedin_url}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Profile Picture</h3>

                {cropMode === 'profile' && profilePhoto ? (
                  <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium">Adjust your crop area visually</p>
                    <div className="mx-auto max-w-sm aspect-square rounded-xl border border-emerald-100 shadow-inner overflow-hidden bg-black/5">
                      <Cropper
                        src={profilePhoto}
                        style={{ width: '100%', height: '100%' }}
                        aspectRatio={1}
                        guides={false}
                        viewMode={1}
                        background={false}
                        responsive
                        autoCropArea={0.9}
                        ref={cropperRef}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={applyCrop}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors"
                      >
                        Apply Crop
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropMode(null)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center hover:bg-green-50 transition-colors">
                    <Upload className="mx-auto mb-3 text-green-600" size={32} />
                    <p className="text-gray-700 font-medium mb-2">Upload Profile Picture</p>
                    <p className="text-sm text-gray-500 mb-4">1:1 Square format recommended</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'profile')}
                      className="hidden"
                      id="profile-upload"
                    />
                    <label
                      htmlFor="profile-upload"
                      className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      Choose Image
                    </label>
                    {profilePhoto && (
                      <div className="mt-4">
                        <p className="text-sm text-green-600 font-medium mb-2">
                          {formatFileSize(getBase64Size(profilePhoto))} - Ready to crop
                        </p>
                        <img
                          src={profilePhoto}
                          alt="Profile preview"
                          className="w-24 h-24 object-cover rounded-lg mx-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Cover Photo</h3>

                {cropMode === 'cover' && coverPhoto ? (
                  <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                    <p className="text-sm text-gray-600 font-medium">Adjust your crop area visually</p>
                    <div className="mx-auto max-w-xl aspect-[16/9] rounded-xl border border-sky-100 shadow-inner overflow-hidden bg-black/5">
                      <Cropper
                        src={coverPhoto}
                        style={{ width: '100%', height: '100%' }}
                        aspectRatio={16 / 9}
                        guides={false}
                        viewMode={1}
                        background={false}
                        responsive
                        autoCropArea={0.95}
                        ref={cropperRef}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={applyCrop}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition-colors"
                      >
                        Apply Crop
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropMode(null)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-sky-300 rounded-lg p-6 text-center hover:bg-sky-50 transition-colors">
                    <Upload className="mx-auto mb-3 text-sky-600" size={32} />
                    <p className="text-gray-700 font-medium mb-2">Upload Cover Photo</p>
                    <p className="text-sm text-gray-500 mb-4">Landscape format recommended (16:9)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(e, 'cover')}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="inline-block bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      Choose Image
                    </label>
                    {coverPhoto && (
                      <div className="mt-4">
                        <p className="text-sm text-sky-600 font-medium mb-2">
                          {formatFileSize(getBase64Size(coverPhoto))} - Ready to crop
                        </p>
                        <img
                          src={coverPhoto}
                          alt="Cover preview"
                          className="w-48 h-24 object-cover rounded-lg mx-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-2 border-t border-gray-200 space-y-3">
                <p className="text-xs text-gray-600">
                  All details you submit here (name, photos, contact and social links) will be{' '}
                  <span className="font-semibold text-gray-800">publicly visible</span> on this
                  website. Anyone can view and find this information.
                </p>
                <label className="flex items-start gap-2 text-xs sm:text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    required
                  />
                  <span>
                    I understand that my information will be publicly available on this site and I
                    confirm that I am a student of Green University of Bangladesh, CSE Batch 221.
                  </span>
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || cropMode !== null || !isSupabaseConfigured || !termsAccepted}
                  className="flex-1 bg-gradient-to-r from-green-600 via-emerald-500 to-sky-500 hover:from-green-700 hover:via-emerald-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105"
                >
                  {loading ? 'Submitting...' : 'Submit Information'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      name: '',
                      phone_number: '',
                      student_id: '',
                      email: '',
                      facebook_url: '',
                      twitter_url: '',
                      linkedin_url: '',
                      blood_group: '',
                      gender: '',
                      hometown: '',
                      permanent_address: '',
                      present_address: '',
                      religion: '',
                      job_designation: '',
                      organization_name: '',
                    });
                    setProfilePhoto('');
                    setCoverPhoto('');
                    setCropMode(null);
                    setTermsAccepted(false);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
