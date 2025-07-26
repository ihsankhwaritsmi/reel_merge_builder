// src/components/UploadForm.jsx
import { useState } from "react";

export default function UploadForm() {
  const [status, setStatus] = useState("ready");

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg mb-8">
      <form className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Create Your Merged Video</h1>
          <p className="text-gray-600 mb-4">
            Upload 5 videos and give your creation a title.
          </p>
          <div
            id="status-indicator"
            className={`status-indicator ${
              status !== "ready" ? status : ""
            } hidden`}
          >
            <span id="status-text">{status}</span>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="title" className="block font-semibold mb-2">
            Merged Video Title
          </label>
          <input
            id="title"
            type="text"
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
            defaultValue={50}
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
                className="sr-only"
              />
            </label>
            <p className="text-sm text-gray-400 mt-2">
              MP4, WEBM, OGG formats supported
            </p>
          </div>
          <ul
            id="uploaded-file-names"
            className="mt-4 list-disc pl-5 text-gray-600"
          ></ul>
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
        >
          Merge Videos
        </button>

        <div
          className="w-full h-1 bg-gray-300 rounded overflow-hidden mt-2 hidden"
          id="progress-container"
        >
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 w-0"
            id="progress-bar"
          ></div>
        </div>
      </form>
    </div>
  );
}
