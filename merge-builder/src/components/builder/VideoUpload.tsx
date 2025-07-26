import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setVideos } from '../../redux/appSlice';
import type { RootState } from '../../redux/store';

interface VideoUploadProps {
  onFilesSelected: (files: File[]) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onFilesSelected }) => {
  const dispatch = useDispatch();
  const { videos } = useSelector((state: RootState) => state.app);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length !== 5) {
        alert('Please select exactly 5 videos.');
        return;
      }
      setVideoFiles(files);
      onFilesSelected(files);
      dispatch(setVideos(files.map(file => URL.createObjectURL(file))));
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Videos</h2>
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-10 h-10 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              ></path>
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">MP4, WEBM, OGG, AVI, MOV (5 files)</p>
          </div>
          <input id="dropzone-file" type="file" className="hidden" multiple onChange={handleFileChange} />
        </label>
      </div>
      {videos.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Uploaded Videos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {videos.map((video, index) => (
              <div key={index} className="rounded-lg overflow-hidden shadow-lg">
                <video src={video} controls className="w-full h-auto"></video>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
