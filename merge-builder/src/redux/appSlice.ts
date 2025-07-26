import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  videos: string[];
  subtitles: string[];
  mainTitle: { text: string; color: string }[][];
  mainTitleColor: string;
  startTime: number;
  wordSpacing: number;
  sessionId: string | null;
  status: string;
  progress: number;
  downloadUrl: string | null;
}

const initialState: AppState = {
  videos: [],
  subtitles: Array(5).fill(''),
  mainTitle: [[{ text: 'Top 5 Moments', color: '#FFFFFF' }]],
  mainTitleColor: '#FFFFFF',
  startTime: 0,
  wordSpacing: 0,
  sessionId: null,
  status: 'idle',
  progress: 0,
  downloadUrl: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setVideos: (state, action: PayloadAction<string[]>) => {
      state.videos = action.payload;
    },
    setSubtitles: (state, action: PayloadAction<string[]>) => {
      state.subtitles = action.payload;
    },
    setMainTitle: (state, action: PayloadAction<{ text: string; color: string }[][]>) => {
      state.mainTitle = action.payload;
    },
    updateWordColor: (state, action: PayloadAction<{ lineIndex: number; wordIndex: number; color: string }>) => {
      const { lineIndex, wordIndex, color } = action.payload;
      state.mainTitle[lineIndex][wordIndex].color = color;
    },
    setMainTitleColor: (state, action: PayloadAction<string>) => {
      state.mainTitleColor = action.payload;
    },
    setStartTime: (state, action: PayloadAction<number>) => {
      state.startTime = action.payload;
    },
    setWordSpacing: (state, action: PayloadAction<number>) => {
      state.wordSpacing = action.payload;
    },
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload;
    },
    setStatus: (state, action: PayloadAction<string>) => {
      state.status = action.payload;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setDownloadUrl: (state, action: PayloadAction<string | null>) => {
      state.downloadUrl = action.payload;
    },
    reset: () => initialState,
  },
});

export const {
  setVideos,
  setSubtitles,
  setMainTitle,
  updateWordColor,
  setMainTitleColor,
  setStartTime,
  setWordSpacing,
  setSessionId,
  setStatus,
  setProgress,
  setDownloadUrl,
  reset,
} = appSlice.actions;

export default appSlice.reducer;
