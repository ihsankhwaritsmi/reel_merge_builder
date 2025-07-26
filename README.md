# Reel Merge Builder

Reel Merge Builder is a web application that allows you to merge multiple videos and add subtitles to them. It's built with a React frontend and a Python backend.

## Getting Started

### Prerequisites

*   Node.js and npm
*   Python 3 and pip

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ihsankhwaritsmi/reel_merge_builder.git
    cd reel_merge_builder
    ```

2.  **Install frontend dependencies:**

    ```bash
    cd merge-builder
    npm install
    ```

3.  **Install backend dependencies:**

    ```bash
    cd ../server
    pip install -r requirements.txt
    ```

### Running the Application

1.  **Start the backend server:**

    ```bash
    cd server
    python main.py
    ```

2.  **Start the frontend development server:**

    ```bash
    cd merge-builder
    npm run dev
    ```

## API Endpoints

The backend server provides the following API endpoints:

*   `POST /upload`: Upload 5 videos to be merged.
*   `POST /process`: Start processing the uploaded videos.
*   `GET /status/{session_id}`: Get the processing status of a video.
*   `GET /download/{session_id}`: Download the processed video.
*   `GET /preview/{session_id}`: Preview the processed video.
*   `DELETE /cleanup/{session_id}`: Clean up the session files.
