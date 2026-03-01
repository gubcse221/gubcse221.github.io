import { useState, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressImage, formatFileSize, getBase64Size } from '../lib/imageUtils';
import { Upload, X, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function UploadPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    student_id: '',
    email: '',
    facebook_url: '',
    twitter_url: '',
    linkedin_url: '',
  });

  const [profilePhoto, setProfilePhoto] = useState<string>('');
  const [coverPhoto, setCoverPhoto] = useState<string>('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);

  const [cropMode, setCropMode] = useState<'profile' | 'cover' | null>(null);
  const [cropData, setCropData] = useState({ x: 0, y: 0, width: 200, height: 200 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const compressed = await compressImage(file, 600, 600, 0.85);

      if (type === 'profile') {
        setProfilePhoto(compressed);
        setProfilePhotoFile(file);
        setCropMode('profile');
      } else {
        setCoverPhoto(compressed);
        setCoverPhotoFile(file);
        setCropMode('cover');
      }

      setMessage(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process image' });
    }
  };

  const handleCropChange = (field: keyof typeof cropData, value: number) => {
    setCropData((prev) => ({ ...prev, [field]: value }));
  };

  const applyCrop = async () => {
    if (!cropMode) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const img = new Image();
      const currentPhoto = cropMode === 'profile' ? profilePhoto : coverPhoto;

      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = cropData.width;
        canvas.height = cropData.height;
        ctx.drawImage(
          img,
          cropData.x,
          cropData.y,
          cropData.width,
          cropData.height,
          0,
          0,
          cropData.width,
          cropData.height
        );

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        if (cropMode === 'profile') {
          setProfilePhoto(croppedBase64);
        } else {
          setCoverPhoto(croppedBase64);
        }

        setCropMode(null);
        setMessage({ type: 'success', text: 'Image cropped successfully' });
      };

      img.src = currentPhoto;
    } catch (error) {
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

      if (existing) {
        setMessage({
          type: 'error',
          text: 'Student ID already exists. Please use a different ID.',
        });
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('students').insert([
        {
          name: formData.name,
          phone_number: formData.phone_number,
          student_id: formData.student_id,
          email: formData.email,
          facebook_url: formData.facebook_url || null,
          twitter_url: formData.twitter_url || null,
          linkedin_url: formData.linkedin_url || null,
          profile_photo_base64: profilePhoto,
          cover_photo_base64: coverPhoto,
          profile_photo_url: '',
          cover_photo_url: '',
          authorized: 0,
          submitted_at: new Date().toISOString(),
        },
      ]);

      if (insertError) throw insertError;

      setMessage({
        type: 'success',
        text: 'Information submitted successfully! Waiting for admin approval.',
      });

      setFormData({
        name: '',
        phone_number: '',
        student_id: '',
        email: '',
        facebook_url: '',
        twitter_url: '',
        linkedin_url: '',
      });
      setProfilePhoto('');
      setCoverPhoto('');

      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit information',
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
                    <p className="text-sm text-gray-600 font-medium">Adjust your crop area</p>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="bg-white p-4 rounded-lg">
                      <img src={profilePhoto} alt="Preview" className="w-full max-h-96 object-contain" />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Start X: {cropData.x}</label>
                        <input
                          type="range"
                          min="0"
                          max="600"
                          value={cropData.x}
                          onChange={(e) => handleCropChange('x', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Start Y: {cropData.y}</label>
                        <input
                          type="range"
                          min="0"
                          max="600"
                          value={cropData.y}
                          onChange={(e) => handleCropChange('y', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Width: {cropData.width}</label>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          value={cropData.width}
                          onChange={(e) => handleCropChange('width', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Height: {cropData.height}</label>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          value={cropData.height}
                          onChange={(e) => handleCropChange('height', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
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
                    <p className="text-sm text-gray-600 font-medium">Adjust your crop area</p>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="bg-white p-4 rounded-lg">
                      <img src={coverPhoto} alt="Preview" className="w-full max-h-96 object-contain" />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Start X: {cropData.x}</label>
                        <input
                          type="range"
                          min="0"
                          max="600"
                          value={cropData.x}
                          onChange={(e) => handleCropChange('x', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Start Y: {cropData.y}</label>
                        <input
                          type="range"
                          min="0"
                          max="600"
                          value={cropData.y}
                          onChange={(e) => handleCropChange('y', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Width: {cropData.width}</label>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          value={cropData.width}
                          onChange={(e) => handleCropChange('width', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Height: {cropData.height}</label>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          value={cropData.height}
                          onChange={(e) => handleCropChange('height', Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
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

              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading || cropMode !== null || !isSupabaseConfigured}
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
                    });
                    setProfilePhoto('');
                    setCoverPhoto('');
                    setCropMode(null);
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
