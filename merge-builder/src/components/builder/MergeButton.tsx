import React from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../redux/store";
import {
  setSessionId,
  setStatus,
  setProgress,
  setDownloadUrl,
  reset,
} from "../../redux/appSlice";

const API_URL = "http://localhost:8000";

interface MergeButtonProps {
  videoFiles: File[];
}

const MergeButton: React.FC<MergeButtonProps> = ({ videoFiles }) => {
  const {
    mainTitle,
    mainTitleColor,
    subtitles,
    startTime,
    wordSpacing,
    status,
    progress,
    downloadUrl,
  } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();

  const handleMerge = async () => {
    if (videoFiles.length !== 5) {
      alert("Please select exactly 5 videos.");
      return;
    }

    dispatch(setStatus("uploading"));
    dispatch(setProgress(0));

    const formData = new FormData();
    videoFiles.forEach((video) => {
      formData.append("videos", video);
    });

    try {
      // Step 1: Upload videos
      const uploadResponse = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
          );
          dispatch(setProgress(percentCompleted));
        },
      });

      const { session_id } = uploadResponse.data;
      dispatch(setSessionId(session_id));
      dispatch(setStatus("processing"));

      // Step 2: Start processing
      const processFormData = new FormData();
      processFormData.append("session_id", session_id);
      processFormData.append("main_title", JSON.stringify(mainTitle));
      processFormData.append("main_title_color", mainTitleColor);
      const momentTitles = subtitles.map((text) => ({
        text,
        color: "#FFFFFF",
      }));
      processFormData.append("moment_titles", JSON.stringify(momentTitles));
      processFormData.append("start_time", startTime.toString());
      processFormData.append("word_spacing", wordSpacing.toString());

      console.log("Process Form Data:", processFormData.getAll);
      await axios.post(`${API_URL}/process`, processFormData);

      // Step 3: Poll for status
      const pollStatus = async () => {
        try {
          const statusResponse = await axios.get(
            `${API_URL}/status/${session_id}`
          );
          const { status, progress, download_url } = statusResponse.data;
          dispatch(setStatus(status));
          dispatch(setProgress(progress));

          if (status === "completed") {
            dispatch(setDownloadUrl(`${API_URL}${download_url}`));
          } else if (status !== "error") {
            setTimeout(pollStatus, 2000);
          }
        } catch (error) {
          dispatch(setStatus("error"));
          console.error("Error polling status:", error);
        }
      };

      pollStatus();
    } catch (error) {
      dispatch(setStatus("error"));
      console.error("Error during merge process:", error);
    }
  };

  const handleReset = () => {
    if (status !== "idle" && status !== "completed" && status !== "error") {
      // eslint-disable-next-line no-restricted-globals
      const confirmed = confirm(
        "Are you sure you want to cancel the ongoing process?"
      );
      if (!confirmed) {
        return;
      }
    }
    dispatch(reset());
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {status === "idle" && (
        <button
          onClick={handleMerge}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-transform transform hover:scale-105"
        >
          Merge Videos
        </button>
      )}

      {status !== "idle" && status !== "completed" && status !== "error" && (
        <div className="w-full text-center">
          <p className="text-xl font-semibold text-gray-700 mb-2">
            {status}...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-6">
            <div
              className="bg-blue-600 h-6 rounded-full text-center text-white font-bold"
              style={{ width: `${progress}%` }}
            >
              {progress}%
            </div>
          </div>
        </div>
      )}

      {status === "completed" && downloadUrl && (
        <div className="text-center">
          <a
            href={downloadUrl}
            download
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Download Video
          </a>
          <button
            onClick={handleReset}
            className="ml-4 inline-block bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Start Over
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <p className="text-xl font-semibold text-red-600 mb-4">
            An error occurred. Please try again.
          </p>
          <button
            onClick={handleReset}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};

export default MergeButton;
