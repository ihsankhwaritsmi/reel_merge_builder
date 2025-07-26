// src/App.jsx
import UploadForm from "../components/UploadForm";
import VideoPreview from "../components/VideoPreview";

function App() {
  return (
    <main className="bg-gray-50 min-h-screen pt-12">
      <UploadForm />
      <VideoPreview />
      <footer className="text-center py-6 text-gray-400 text-sm border-t mt-4">
        <p>&copy; 2025 Hares, Ihsan, and Indra. All rights reserved.</p>
      </footer>
    </main>
  );
}

export default App;
