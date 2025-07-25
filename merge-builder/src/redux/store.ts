import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['app/setVideos'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload'],
        // Ignore these paths in the state
        ignoredPaths: ['app.videos'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
