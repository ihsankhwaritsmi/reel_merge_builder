import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import VideoUpload from '../components/builder/VideoUpload';
import Subtitles from '../components/builder/Subtitles';
import MainTitle from '../components/builder/MainTitle';
import MergeButton from '../components/builder/MergeButton';

const HomePage: React.FC = () => {
  const { status, downloadUrl, sessionId } = useSelector((state: RootState) => state.app);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  return (
    <div className="bg-gray-100 min-h-screen w-full">
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800">Merge Video Builder</h1>
          <p className="text-lg text-gray-600 mt-2">Create stunning videos in minutes</p>
        </header>
        
        <div className="w-full">
          {status !== 'completed' ? (
            <div className="space-y-8">
              <VideoUpload onFilesSelected={setVideoFiles} />
              <Subtitles />
              <MainTitle />
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg shadow-lg text-center">
              <h2 className="text-3xl font-bold text-green-600 mb-4">Processing Complete!</h2>
              <p className="text-gray-700 mb-6">Your video is ready for download and preview.</p>
              {downloadUrl && sessionId && (
                <div className="mt-8">
                  <h3 className="text-2xl font-semibold mb-4 text-gray-800">Preview</h3>
                  <video
                    src={`http://localhost:8000/preview/${sessionId}`}
                    controls
                    className="rounded-lg shadow-md w-full max-w-lg mx-auto"
                  ></video>

                  {/* <MergeButton videoFiles={videoFiles} /> */}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-8">
            <MergeButton videoFiles={videoFiles} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
