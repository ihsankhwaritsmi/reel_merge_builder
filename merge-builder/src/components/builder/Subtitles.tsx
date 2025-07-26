import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../redux/store';
import { setSubtitles } from '../../redux/appSlice';

const Subtitles: React.FC = () => {
  const subtitles = useSelector((state: RootState) => state.app.subtitles);
  const dispatch = useDispatch();

  const handleSubtitleChange = (index: number, value: string) => {
    const newSubtitles = [...subtitles];
    newSubtitles[index] = value;
    dispatch(setSubtitles(newSubtitles));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Moment Titles</h2>
      <div className="space-y-4">
        {subtitles.map((subtitle, index) => (
          <div key={index} className="flex items-center space-x-4">
            <span className="text-lg font-semibold text-gray-600">{index + 1}.</span>
            <input
              type="text"
              placeholder={`Title for video ${index + 1}`}
              value={subtitle}
              onChange={(e) => handleSubtitleChange(index, e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Subtitles;
