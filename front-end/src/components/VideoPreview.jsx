// src/components/VideoPreview.jsx
import { useState, useEffect } from "react";

export default function VideoPreview() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  useEffect(() => {
    const handleVideoProcessed = (event) => {
      setVideoUrl(event.detail.previewUrl);
      setDownloadUrl(event.detail.downloadUrl);
    };

    window.addEventListener("videoProcessed", handleVideoProcessed);

    return () => {
      window.removeEventListener("videoProcessed", handleVideoProcessed);
    };
  }, []);

  if (!videoUrl) return null;

  return (
    <div
      className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 text-center"
      id="video-preview-section"
    >
      <h2 className="text-2xl font-bold mb-4">
        Your Processed Video is Ready!
      </h2>
      <video
        key={videoUrl}
        controls
        className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <a
        href={downloadUrl}
        download="merged_video.mp4"
        className="mt-4 inline-block bg-green-500 text-white py-2 px-6 rounded-md text-lg font-semibold hover:bg-green-600"
      >
        Download Video
      </a>
    </div>
  );
}
