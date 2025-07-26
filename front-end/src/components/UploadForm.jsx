// src/components/UploadForm.jsx
import { useState } from "react";

export default function UploadForm() {
  const [files, setFiles] = useState([]);
  const [mainTitle, setMainTitle] = useState("");
  const [momentTitles, setMomentTitles] = useState(Array(5).fill(""));
  const [mainTitleY, setMainTitleY] = useState(50);
  const [status, setStatus] = useState("ready");
  const [progress, setProgress] = useState(0);
  const [sessionId, setSessionId] = useState(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      alert("You can only upload a maximum of 5 files.");
      setFiles([]);
    } else {
      setFiles(selectedFiles);
    }
  };

  const handleMomentTitleChange = (index, value) => {
    const newTitles = [...momentTitles];
    newTitles[index] = value;
    setMomentTitles(newTitles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length !== 5) {
      alert("Please select exactly 5 video files.");
      return;
    }
    setStatus("uploading");
    setProgress(20);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("videos", file);
    });

    try {
      const uploadResponse = await fetch("http://localhost:5002/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }

      const uploadResult = await uploadResponse.json();
      setSessionId(uploadResult.session_id);
      setStatus("processing");
      setProgress(50);

      const processResponse = await fetch("http://localhost:5002/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: uploadResult.session_id,
          main_title: mainTitle,
          main_title_y: mainTitleY,
          moment_titles: momentTitles.map((title) => ({
            text: title,
            color: "#FFFFFF",
          })),
        }),
      });

      if (!processResponse.ok) {
        throw new Error("Video processing failed");
      }

      const processResult = await processResponse.json();

      // Poll for status
      const pollStatus = async () => {
        const statusResponse = await fetch(
          `http://localhost:5002/status/${processResult.session_id}`
        );
        const statusResult = await statusResponse.json();

        if (statusResult.status === "completed") {
          setStatus("completed");
          setProgress(100);
          // Pass the download URL to the parent or a global state
          window.dispatchEvent(
            new CustomEvent("videoProcessed", {
              detail: {
                downloadUrl: `http://localhost:5002${statusResult.download_url}`,
                previewUrl: `http://localhost:5002/preview/${processResult.session_id}`,
              },
            })
          );
        } else if (statusResult.status === "error") {
          throw new Error(statusResult.error);
        } else {
          setProgress(statusResult.progress || 75);
          setTimeout(pollStatus, 2000);
        }
      };

      pollStatus();
    } catch (error) {
      console.error("Error:", error);
      setStatus("error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create Your Merged Video</h1>
          <p className="text-gray-600 mb-4">
            Upload 5 videos and give your creation a title.
          </p>
          {status !== "ready" && (
            <div id="status-indicator" className={`status-indicator ${status}`}>
              <span id="status-text">{status}</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="title" className="block font-semibold mb-2">
            Merged Video Title
          </label>
          <input
            id="title"
            type="text"
            value={mainTitle}
            onChange={(e) => setMainTitle(e.target.value)}
            placeholder="e.g., My Awesome Compilation"
            className="w-full border px-4 py-2 rounded-md"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="main-title-y" className="block font-semibold mb-2">
            Main Title Vertical Position (in pixels)
          </label>
          <input
            id="main-title-y"
            type="number"
            value={mainTitleY}
            onChange={(e) => setMainTitleY(parseInt(e.target.value, 10))}
            className="w-full border px-4 py-2 rounded-md"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-2">
            Upload Videos (5 Required)
          </label>
          <div className="border-2 border-dashed bg-purple-50 p-6 rounded-md text-center cursor-pointer">
            <p className="text-lg font-semibold text-gray-700">
              Drag & Drop your videos here
            </p>
            <p>or</p>
            <label className="inline-block bg-indigo-500 text-white py-2 px-4 rounded cursor-pointer mt-2 hover:bg-indigo-600">
              <span>Browse files</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg"
                multiple
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <p className="text-sm text-gray-400 mt-2">
              MP4, WEBM, OGG formats supported
            </p>
          </div>
          <ul className="mt-4 list-disc pl-5 text-gray-600">
            {files.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <div key={i}>
              <label
                htmlFor={`moment-title-${i}`}
                className="block font-semibold mb-2"
              >
                Title for Moment #{i + 1}
              </label>
              <input
                id={`moment-title-${i}`}
                type="text"
                value={momentTitles[i]}
                onChange={(e) => handleMomentTitleChange(i, e.target.value)}
                placeholder={`e.g., ${
                  [
                    "Opening Scene",
                    "Mid-action",
                    "Highlight Reel",
                    "Transition",
                    "Grand Finale",
                  ][i]
                }`}
                className="w-full border px-4 py-2 rounded-md"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          id="submit-button"
          className="w-full bg-indigo-500 text-white py-3 rounded-md text-lg font-semibold hover:bg-indigo-600"
          disabled={status === "uploading" || status === "processing"}
        >
          {status === "uploading"
            ? "Uploading..."
            : status === "processing"
            ? "Processing..."
            : "Merge Videos"}
        </button>

        {(status === "uploading" ||
          status === "processing" ||
          status === "completed") && (
          <div
            className="w-full h-4 bg-gray-300 rounded overflow-hidden mt-2"
            id="progress-container"
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-400"
              id="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </form>
    </div>
  );
}
