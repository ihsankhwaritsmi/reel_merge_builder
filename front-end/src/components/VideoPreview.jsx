// src/components/VideoPreview.jsx
export default function VideoPreview({ videoUrl }) {
  if (!videoUrl) return null; // jangan render apapun jika belum ada video

  return (
    <div
      className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 text-center hidden"
      id="video-preview-section"
    >
      <h2 className="text-2xl font-bold mb-4">
        Your Processed Video is Ready!
      </h2>
      <video controls className="w-full max-w-2xl mx-auto rounded-lg shadow-lg">
        <source src="{videoUrl}" type="video/mp4" />
      </video>
    </div>
  );
}
