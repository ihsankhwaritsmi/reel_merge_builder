import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../redux/store';
import { setMainTitle, updateWordColor, setMainTitleColor, setStartTime, setWordSpacing } from '../../redux/appSlice';

const MainTitle: React.FC = () => {
  const { mainTitle, mainTitleColor, startTime, wordSpacing } = useSelector((state: RootState) => state.app);
  const dispatch = useDispatch();

  const [inputValue, setInputValue] = useState(mainTitle.map(line => line.map(word => word.text).join(' ')).join('\n'));
  const [selectedWord, setSelectedWord] = useState<{ lineIndex: number; wordIndex: number } | null>(null);

  useEffect(() => {
    const lines = inputValue.split('\n').map(line =>
      line.split(' ').map(word => {
        const existingWord = mainTitle.flat().find(w => w.text === word);
        return { text: word, color: existingWord ? existingWord.color : mainTitleColor };
      })
    );
    dispatch(setMainTitle(lines));
  }, [inputValue, mainTitleColor, dispatch]);

  const handleWordClick = (lineIndex: number, wordIndex: number) => {
    setSelectedWord({ lineIndex, wordIndex });
  };

  const handleColorChange = (color: string) => {
    if (selectedWord) {
      dispatch(updateWordColor({ ...selectedWord, color }));
    }
  };

  return (
    <div className="mb-6 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Main Title</h2>
      
      <div className="p-4 border-2 border-dashed rounded-lg mb-4 bg-black" style={{ minHeight: '120px' }}>
        {mainTitle.map((line, lineIndex) => (
          <div key={lineIndex} className="flex flex-wrap items-center justify-center">
            {line.map((word, wordIndex) => (
              <span
                key={wordIndex}
                onClick={() => handleWordClick(lineIndex, wordIndex)}
                style={{
                  color: word.color,
                  cursor: 'pointer',
                  margin: `0 ${wordSpacing / 4}px`,
                  padding: '4px 0px',
                  borderRadius: '6px',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  backgroundColor: selectedWord?.lineIndex === lineIndex && selectedWord?.wordIndex === wordIndex ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
              >
                {word.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      {selectedWord && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <label className="block text-md font-semibold text-gray-700 mb-2">Color for "{mainTitle[selectedWord.lineIndex][selectedWord.wordIndex].text}"</label>
          <input
            type="color"
            value={mainTitle[selectedWord.lineIndex][selectedWord.wordIndex].color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-full h-12 p-1 border-2 border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
      )}

      <textarea
        placeholder="Enter main title here..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
        rows={3}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-md font-semibold text-gray-700 mb-2">Default Color</label>
          <input
            type="color"
            value={mainTitleColor}
            onChange={(e) => dispatch(setMainTitleColor(e.target.value))}
            className="w-full h-12 p-1 border-2 border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-md font-semibold text-gray-700 mb-2">Start Time (seconds)</label>
          <input
            type="number"
            value={startTime}
            onChange={(e) => dispatch(setStartTime(parseFloat(e.target.value)))}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-800"
          />
        </div>
        <div>
          <label className="block text-md font-semibold text-gray-700 mb-2">Word Spacing</label>
          <input
            type="range"
            min="10"
            max="50"
            value={wordSpacing}
            onChange={(e) => dispatch(setWordSpacing(parseInt(e.target.value)))}
            className="w-full h-12 p-1 border-2 border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default MainTitle;
