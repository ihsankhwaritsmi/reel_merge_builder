from flask import Flask, request, jsonify, send_file
from flask_cors import CORS, cross_origin
import os
import json
import subprocess
from werkzeug.utils import secure_filename
import tempfile
import shutil
from main import concatenate_videos, add_text_ffmpeg
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from PIL import ImageFont

APP_ROOT = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuration
UPLOAD_FOLDER = os.path.join(APP_ROOT, 'uploads')
PROCESSED_FOLDER = os.path.join(APP_ROOT, 'processed')
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'ogg', 'avi', 'mov'}

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Thread pool for background processing
executor = ThreadPoolExecutor(max_workers=4)
processing_status = {}  # Track processing status for each session


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_video_dimensions(video_path):
    """Get video width and height using ffprobe"""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height",
             "-of", "csv=s=x:p=0", video_path],
            capture_output=True, text=True, check=True
        )
        width, height = map(int, result.stdout.strip().split('x'))
        return width, height
    except (subprocess.CalledProcessError, ValueError):
        return 1920, 1080  # Default resolution if error


def get_video_duration(video_path):
    """Get video duration using ffprobe"""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", video_path],
            capture_output=True, text=True, check=True
        )
        return float(result.stdout.strip())
    except subprocess.CalledProcessError:
        return 10.0  # Default duration if error


def get_video_durations_parallel(video_paths):
    """Get video durations for multiple videos in parallel"""
    with ThreadPoolExecutor(max_workers=5) as duration_executor:
        future_to_path = {duration_executor.submit(
            get_video_duration, path): path for path in video_paths}
        durations = {}

        for future in as_completed(future_to_path):
            path = future_to_path[future]
            try:
                duration = future.result()
                durations[path] = duration
            except Exception as exc:
                print(
                    f'Duration check for {path} generated an exception: {exc}')
                durations[path] = 10.0

    # Return durations in the same order as input paths
    return [durations[path] for path in video_paths]


def process_video_background(session_id, main_title, main_title_color, moment_titles, start_time, main_title_y):
    """Background video processing function"""
    try:
        processing_status[session_id] = {
            'status': 'processing', 'step': 'Starting...', 'progress': 0}

        session_folder = os.path.join(UPLOAD_FOLDER, session_id)
        input_videos = [os.path.join(
            session_folder, f"video{i}.mp4") for i in range(1, 6)]

        # Output paths
        processed_folder = os.path.join(PROCESSED_FOLDER, session_id)
        os.makedirs(processed_folder, exist_ok=True)

        concatenated_output = os.path.join(
            processed_folder, "concatenated.mp4")
        final_output = os.path.join(processed_folder, "final_output.mp4")

        # Step 1: Concatenate videos
        processing_status[session_id].update(
            {'step': 'Concatenating videos...', 'progress': 20})
        concatenate_videos(input_videos, concatenated_output)

        if not os.path.exists(concatenated_output):
            processing_status[session_id] = {
                'status': 'error', 'error': 'Video concatenation failed'}
            return

        # Step 2: Get video durations and dimensions
        processing_status[session_id].update(
            {'step': 'Analyzing video...', 'progress': 40})
        video_durations = get_video_durations_parallel(input_videos)
        total_video_duration = sum(video_durations)
        video_width, video_height = get_video_dimensions(concatenated_output)

        # Step 3: Configure text overlays
        processing_status[session_id].update(
            {'step': 'Configuring text overlays...', 'progress': 60})
        text_configs = []

        # Add main title config
        import re

        def get_text_width(text, fontsize, font_path="server-side/fonts/SpecialGothicExpandedOne-Regular.ttf"):
            try:
                font = ImageFont.truetype(font_path, fontsize)
                return font.getlength(text)
            except IOError:
                # Fallback if font file is not found
                return len(text) * (fontsize / 2)

        # --- Main Title with Word Wrap ---
        parts = main_title.split('<<')

        # First, break down the title into words and their associated colors
        words_with_colors = []
        for i, p in enumerate(parts):
            color = main_title_color
            text_segment = ""

            if i == 0:
                text_segment = p
            elif '>>' in p:
                color_part, text_part = p.split('>>', 1)
                color = color_part.strip()
                text_segment = text_part
            else:
                text_segment = p

            # Split segment into words and preserve spaces
            words = text_segment.split(' ')
            for j, word in enumerate(words):
                if word:
                    # Add space back in, except for the last word of a segment
                    word_to_add = word + ' ' if j < len(words) - 1 else word
                    words_with_colors.append(
                        {'text': word_to_add, 'color': color})

        # Now, build lines with wrapping
        lines = []
        current_line = []
        current_line_width = 0
        line_height = 60  # Approx height for fontsize 50
        padding = 100  # Padding from screen edges

        for word_info in words_with_colors:
            word_width = get_text_width(word_info['text'], 50)

            if current_line_width + word_width > video_width - padding and current_line:
                lines.append(
                    {'parts': current_line, 'width': current_line_width})
                current_line = [word_info]
                current_line_width = word_width
            else:
                current_line.append(word_info)
                current_line_width += word_width

        if current_line:
            lines.append({'parts': current_line, 'width': current_line_width})

        # Generate text_configs for each line
        base_y = main_title_y
        for i, line in enumerate(lines):
            line_y = base_y + (i * line_height)
            x_offset = 0
            for part in line['parts']:
                # Center each line based on its calculated width
                start_x = (video_width - line['width']) / 2
                current_x_expression = f'{start_x} + {x_offset}'

                text_configs.append({
                    'text': part['text'],
                    'start_time': start_time,
                    'duration': total_video_duration - start_time,
                    'fontsize': 50,
                    'y': str(line_y),
                    'fontcolor': part['color'],
                    'x': current_x_expression
                })
                x_offset += get_text_width(part['text'], 50)

        # Static list of numbers (1., 2., etc.)
        base_y_position_numbers = 0.2
        line_height_offset = 0.05

        for i in range(len(moment_titles)):
            number_y_ratio = base_y_position_numbers + (i * line_height_offset)
            text_configs.append({
                'text': f"{i+1}.",
                'start_time': start_time,
                'duration': total_video_duration - start_time,
                'fontsize': 35,
                'y': f'h*{number_y_ratio}',
                'fontcolor': '#FFFFFF',
                'x': '20'
            })

        # Individual clip titles that appear incrementally
        current_cumulative_time = 0

        for i, title_info in enumerate(moment_titles):
            title_y_ratio = base_y_position_numbers + (i * line_height_offset)

            text_configs.append({
                'text': title_info['text'],
                'start_time': current_cumulative_time,
                'duration': total_video_duration - current_cumulative_time,
                'fontsize': 35,
                'y': f'h*{title_y_ratio}',
                'x': '80',
                'fontcolor': title_info['color']
            })

            current_cumulative_time += video_durations[i]

        # Step 4: Add text overlays
        processing_status[session_id].update(
            {'step': 'Adding text overlays...', 'progress': 80})
        font_file = "server-side/fonts/SpecialGothicExpandedOne-Regular.ttf"

        # Check if font file exists, if not use default
        if not os.path.exists(font_file):
            font_file = "/System/Library/Fonts/Arial.ttf"  # macOS default
            if not os.path.exists(font_file):
                font_file = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"  # Linux default
                if not os.path.exists(font_file):
                    font_file = "arial"

        add_text_ffmpeg(concatenated_output, final_output,
                        text_configs, font_file)

        if not os.path.exists(final_output):
            processing_status[session_id] = {
                'status': 'error', 'error': 'Text overlay processing failed'}
            return

        # Processing complete
        processing_status[session_id] = {
            'status': 'completed',
            'step': 'Processing complete!',
            'progress': 100,
            'download_url': f'/download/{session_id}'
        }

    except Exception as e:
        processing_status[session_id] = {'status': 'error', 'error': str(e)}


@app.route('/upload', methods=['POST'])
def upload_files():
    """Handle file uploads with parallel processing"""
    try:
        # Check if files are present
        if 'videos' not in request.files:
            return jsonify({'error': 'No files provided'}), 400

        files = request.files.getlist('videos')

        if len(files) != 5:
            return jsonify({'error': 'Exactly 5 videos are required'}), 400

        # Generate unique session ID
        session_id = str(uuid.uuid4())
        session_folder = os.path.join(UPLOAD_FOLDER, session_id)
        os.makedirs(session_folder, exist_ok=True)

        # Initialize processing status
        processing_status[session_id] = {
            'status': 'uploading', 'step': 'Uploading files...', 'progress': 0}

        def save_file(file_data):
            """Save a single file"""
            file, index = file_data
            if file.filename == '':
                raise ValueError(f'Empty filename for file {index}')

            if not (file and allowed_file(file.filename)):
                raise ValueError(f'Invalid file type: {file.filename}')

            # Create consistent naming
            filename = f"video{index+1}.mp4"
            filepath = os.path.join(session_folder, filename)
            file.save(filepath)
            return filepath

        # Upload files in parallel
        uploaded_files = []
        with ThreadPoolExecutor(max_workers=5) as upload_executor:
            file_data = [(file, i) for i, file in enumerate(files)]
            future_to_file = {upload_executor.submit(
                save_file, fd): fd for fd in file_data}

            for future in as_completed(future_to_file):
                try:
                    filepath = future.result()
                    uploaded_files.append(filepath)
                except Exception as exc:
                    # Clean up on error
                    if os.path.exists(session_folder):
                        shutil.rmtree(session_folder)
                    return jsonify({'error': str(exc)}), 400

        processing_status[session_id] = {
            'status': 'uploaded', 'step': 'Upload complete', 'progress': 100}

        return jsonify({
            'message': 'Files uploaded successfully',
            'session_id': session_id,
            'files': [os.path.basename(f) for f in uploaded_files]
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/process', methods=['POST'])
def process_video():
    """Start video processing in background"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        session_id = data.get('session_id')
        main_title = data.get('main_title', 'Top 5 Moments')
        main_title_color = data.get('main_title_color', '#FFFFFF')
        moment_titles = data.get('moment_titles', [])
        start_time = float(data.get('start_time', 0))
        main_title_y = data.get('main_title_y', 10)

        if not session_id:
            return jsonify({'error': 'Session ID required'}), 400

        if len(moment_titles) != 5:
            return jsonify({'error': 'Exactly 5 moment titles required'}), 400

        session_folder = os.path.join(UPLOAD_FOLDER, session_id)
        if not os.path.exists(session_folder):
            return jsonify({'error': 'Session not found'}), 404

        # Check if all videos exist
        input_videos = [os.path.join(
            session_folder, f"video{i}.mp4") for i in range(1, 6)]
        for video_path in input_videos:
            if not os.path.exists(video_path):
                return jsonify({'error': f'Video file not found: {os.path.basename(video_path)}'}), 404

        # Start background processing
        executor.submit(process_video_background, session_id, main_title,
                        main_title_color, moment_titles, start_time, main_title_y)

        return jsonify({
            'message': 'Video processing started',
            'session_id': session_id,
            'status_url': f'/status/{session_id}'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/status/<session_id>')
def get_processing_status(session_id):
    """Get processing status for a session"""
    try:
        if session_id not in processing_status:
            return jsonify({'error': 'Session not found'}), 404

        return jsonify(processing_status[session_id])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/download/<session_id>')
@cross_origin()
def download_video(session_id):
    """Download the processed video"""
    try:
        final_output = os.path.join(
            PROCESSED_FOLDER, session_id, "final_output.mp4")

        if not os.path.exists(final_output):
            return jsonify({'error': 'Processed video not found'}), 404

        return send_file(final_output,
                         as_attachment=True,
                         download_name=f"merged_video_{session_id}.mp4",
                         mimetype='video/mp4')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/preview/<session_id>')
@cross_origin()
def preview_video(session_id):
    """Stream the processed video for preview"""
    try:
        final_output = os.path.join(
            PROCESSED_FOLDER, session_id, "final_output.mp4")

        if not os.path.exists(final_output):
            return jsonify({'error': 'Processed video not found'}), 404

        return send_file(final_output, mimetype='video/mp4')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/cleanup/<session_id>', methods=['DELETE'])
def cleanup_session(session_id):
    """Clean up session files"""
    try:
        # Remove from processing status
        if session_id in processing_status:
            del processing_status[session_id]

        # Remove upload folder
        upload_path = os.path.join(UPLOAD_FOLDER, session_id)
        if os.path.exists(upload_path):
            shutil.rmtree(upload_path)

        # Remove processed folder
        processed_path = os.path.join(PROCESSED_FOLDER, session_id)
        if os.path.exists(processed_path):
            shutil.rmtree(processed_path)

        return jsonify({'message': 'Session cleaned up successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001, threaded=True)
