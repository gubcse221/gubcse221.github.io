import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressImage, formatFileSize, getBase64Size } from '../lib/imageUtils';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

const HANDLE_SIZE = 28; // Touch-friendly resize handle (min ~44px for a11y is ideal; 28px is usable)
const MIN_CROP = 60;

function getClientCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('touches' in e && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  const me = e as MouseEvent;
  return { x: me.clientX, y: me.clientY };
}

/**
 * Draggable and resizable crop overlay. Works with mouse and touch (desktop + mobile).
 */
function VisualCropper({
  src,
  crop,
  setCrop,
  aspect,
  containerSize,
}: {
  src: string;
  crop: { x: number; y: number; width: number; height: number };
  setCrop: React.Dispatch<React.SetStateAction<{ x: number; y: number; width: number; height: number }>>;
  aspect?: number;
  containerSize: { width: number; height: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ type: 'move' | 'resize'; x: number; y: number } | null>(null);
  const cropRef = useRef(crop);
  cropRef.current = crop;

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

  const onPointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize') => {
      e.preventDefault();
      const coords = getClientCoords(e.nativeEvent as MouseEvent | TouchEvent);
      startRef.current = { type, x: coords.x, y: coords.y };
      const onMove = (ev: MouseEvent | TouchEvent) => {
        ev.preventDefault();
        if (!startRef.current) return;
        const { x, y } = getClientCoords(ev);
        const dx = x - startRef.current.x;
        const dy = y - startRef.current.y;
        const cur = cropRef.current;

        if (startRef.current.type === 'move') {
          setCrop((prev: { x: number; y: number; width: number; height: number }) => ({
            ...prev,
            x: clamp(prev.x + dx, 0, containerSize.width - prev.width),
            y: clamp(prev.y + dy, 0, containerSize.height - prev.height),
          }));
        } else {
          let newWidth = clamp(cur.width + dx, MIN_CROP, containerSize.width - cur.x);
          let newHeight = clamp(cur.height + dy, MIN_CROP, containerSize.height - cur.y);
          if (aspect) {
            if (newWidth / newHeight > aspect) newWidth = newHeight * aspect;
            else newHeight = newWidth / aspect;
          }
          setCrop((prev: { x: number; y: number; width: number; height: number }) => ({ ...prev, width: newWidth, height: newHeight }));
        }
        startRef.current = { ...startRef.current, x, y };
      };
      const onMoveTouch = (ev: TouchEvent) => { ev.preventDefault(); onMove(ev); };
      const touchOpts = { passive: false } as { passive: boolean };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove as (e: MouseEvent) => void);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMoveTouch);
        window.removeEventListener('touchend', onUp);
        startRef.current = null;
      };
      window.addEventListener('mousemove', onMove as (e: MouseEvent) => void);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMoveTouch, touchOpts);
      window.addEventListener('touchend', onUp);
    },
    [containerSize, aspect, setCrop]
  );

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-100 mx-auto touch-none select-none"
      style={{
        width: containerSize.width,
        height: containerSize.height,
        maxWidth: '100%',
        marginTop: 12,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt="Crop"
        className="block pointer-events-none"
        style={{ width: containerSize.width, height: containerSize.height }}
        draggable={false}
      />
      <div
        className="absolute border-2 border-green-600 bg-green-600/10 z-[2] touch-none cursor-move"
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
          boxSizing: 'border-box',
        }}
        onMouseDown={(e) => onPointerDown(e, 'move')}
        onTouchStart={(e) => onPointerDown(e, 'move')}
        title="Drag to move"
      >
        <div
          className="absolute bg-white border-2 border-green-600 rounded-lg cursor-nwse-resize z-[3] flex items-center justify-center touch-none active:scale-95"
          style={{
            right: -HANDLE_SIZE / 2,
            bottom: -HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            minWidth: HANDLE_SIZE,
            minHeight: HANDLE_SIZE,
          }}
          onMouseDown={(e) => { e.stopPropagation(); onPointerDown(e, 'resize'); }}
          onTouchStart={(e) => { e.stopPropagation(); onPointerDown(e, 'resize'); }}
          title="Drag to resize"
        >
          <span className="block w-3 h-3 bg-green-600 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

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

  const [cropMode, setCropMode] = useState<'profile' | 'cover' | null>(null);

  // Responsive crop container sizes (desktop + mobile friendly)
  const getProfileSize = useCallback(() => {
    const w = typeof window !== 'undefined' ? Math.min(320, window.innerWidth - 48) : 320;
    return { width: w, height: w };
  }, []);
  const getCoverSize = useCallback(() => {
    const w = typeof window !== 'undefined' ? Math.min(480, window.innerWidth - 48) : 480;
    return { width: w, height: Math.round(w * (9 / 16)) };
  }, []);

  const [profileContainer, setProfileContainer] = useState(() => getProfileSize());
  const [coverContainer, setCoverContainer] = useState(() => getCoverSize());

  useEffect(() => {
    const update = () => {
      setProfileContainer(getProfileSize());
      setCoverContainer(getCoverSize());
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [getProfileSize, getCoverSize]);

  const [cropData, setCropData] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 60,
    y: 60,
    width: 200,
    height: 200,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      // Higher max size on desktop for better crop quality; smaller on mobile to keep base64 small
      const maxSize = typeof window !== 'undefined' && window.innerWidth >= 768 ? 1000 : 600;
      const compressed = await compressImage(file, maxSize, maxSize, 0.85);

      if (type === 'profile') {
        setProfilePhoto(compressed);
        const size = getProfileSize();
        const margin = 40;
        const side = Math.max(MIN_CROP, size.width - margin * 2);
        setCropData({
          x: (size.width - side) / 2,
          y: (size.height - side) / 2,
          width: side,
          height: side,
        });
        setCropMode('profile');
      } else {
        setCoverPhoto(compressed);
        const size = getCoverSize();
        const margin = 24;
        const w = Math.max(MIN_CROP, size.width - margin * 2);
        const h = Math.round(w * (9 / 16));
        setCropData({
          x: (size.width - w) / 2,
          y: Math.max(0, (size.height - h) / 2),
          width: w,
          height: Math.min(h, size.height),
        });
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
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Set canvas to crop rect size
      canvas.width = cropData.width;
      canvas.height = cropData.height;

      const img = new window.Image();
      const currentPhoto = cropMode === 'profile' ? profilePhoto : coverPhoto;

      // Image source must be the original, but render onto our displayed size
      // so that cropping coordinates match the preview/visual crop canvas
      img.onload = () => {
        const previewSize = cropMode === 'profile' ? profileContainer : coverContainer;
        const scaleX = img.naturalWidth / previewSize.width;
        const scaleY = img.naturalHeight / previewSize.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw only the selected area clipped/scaled from original image
        ctx.drawImage(
          img,
          cropData.x * scaleX,
          cropData.y * scaleY,
          cropData.width * scaleX,
          cropData.height * scaleY,
          0,
          0,
          canvas.width,
          canvas.height
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
                    <canvas ref={canvasRef} className="hidden" />
                    <VisualCropper
                      src={profilePhoto}
                      crop={cropData}
                      setCrop={setCropData}
                      aspect={1}
                      containerSize={profileContainer}
                    />
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
                    <p className="text-sm text-gray-600 font-medium">Adjust your crop area visually</p>
                    <canvas ref={canvasRef} className="hidden" />
                    <VisualCropper
                      src={coverPhoto}
                      crop={cropData}
                      setCrop={setCropData}
                      aspect={16 / 9}
                      containerSize={coverContainer}
                    />
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
