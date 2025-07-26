import subprocess
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import ImageFont
import shutil
import uuid


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


def concatenate_videos(video_paths, output_path):
    """Concatenate multiple videos into one using ffmpeg."""
    concat_list_path = f"concat_list_{uuid.uuid4()}.txt"
    with open(concat_list_path, "w") as f:
        for path in video_paths:
            f.write(f"file '{os.path.abspath(path)}'\n")

    command = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_path,
        "-c:v", "libx264",
        "-crf", "28",
        "-c:a", "aac",
        "-b:a", "128k",
        output_path
    ]
    subprocess.run(command, check=True)
    os.remove(concat_list_path)


def add_text_ffmpeg(input_video, output_video, text_configs, font_file):
    """Add text overlays to a video using ffmpeg."""
    filter_complex = []

    for config in text_configs:
        text = config['text']
        start = config['start_time']
        end = start + config['duration']
        fontsize = config.get('fontsize', 24)
        fontcolor = config.get('fontcolor', 'white')
        x = config.get('x', '(w-text_w)/2')
        y = config.get('y', '(h-text_h)/2')

        # Handle y_ratio if provided
        if 'y_ratio' in config:
            y = f"h*{config['y_ratio']}"

        # Escape single quotes in text
        text = text.replace("'", "'\\\\''")

        # Use absolute path for font file
        abs_font_file = os.path.abspath(font_file)

        filter_complex.append(
            f"drawtext=fontfile='{abs_font_file}':text='{text}':fontsize={fontsize}:fontcolor={fontcolor}:x={x}:y={y}:enable='between(t,{start},{end})'"
        )

    command = [
        "ffmpeg",
        "-y",
        "-hwaccel", "auto",
        "-i", input_video,
        "-vf", ",".join(filter_complex),
        "-c:v", "libx264",
        "-crf", "28",
        "-c:a", "aac",
        "-b:a", "128k",
        output_video
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print("ffmpeg error:")
        print(e.stderr)
        raise


def process_video_background(session_id, main_title, main_title_color, moment_titles, start_time, word_spacing, processing_status, upload_folder, processed_folder):
    """Background video processing function"""
    try:
        processing_status[session_id] = {
            'status': 'processing', 'step': 'Starting...', 'progress': 0}

        session_folder = os.path.join(upload_folder, session_id)
        input_videos = [os.path.join(
            session_folder, f"video{i}.mp4") for i in range(1, 6)]
        input_videos.reverse()

        # Output paths
        processed_session_folder = os.path.join(processed_folder, session_id)
        os.makedirs(processed_session_folder, exist_ok=True)

        concatenated_output = os.path.join(
            processed_session_folder, "concatenated.mp4")
        final_output = os.path.join(
            processed_session_folder, "final_output.mp4")

        # Concatenate videos
        processing_status[session_id].update(
            {'step': 'Concatenating videos...', 'progress': 20})
        concatenate_videos(input_videos, concatenated_output)

        if not os.path.exists(concatenated_output):
            processing_status[session_id] = {
                'status': 'error', 'error': 'Video concatenation failed'}
            return

        # Get video durations and dimensions
        processing_status[session_id].update(
            {'step': 'Analyzing video...', 'progress': 40})
        video_durations = get_video_durations_parallel(input_videos)
        total_video_duration = sum(video_durations)
        video_width, video_height = get_video_dimensions(concatenated_output)

        # Configure text overlays
        processing_status[session_id].update(
            {'step': 'Configuring text overlays...', 'progress': 60})
        text_configs = []

        font_path = "fonts/SpecialGothicExpandedOne-Regular.ttf"
        try:
            font = ImageFont.truetype(font_path, 50)
        except IOError:
            font = None

        def get_text_width(text, fontsize, font=font):
            if font:
                return font.getlength(text)
            else:
                return len(text) * (fontsize / 2)

        import json
        lines_data = json.loads(main_title)

        # --- Generate FFMPEG text_configs ---
        base_y = 100
        line_height = 60

        for i, line in enumerate(lines_data):
            line_y = base_y + (i * line_height)

            # Calculate total width of the line with spacing
            line_width = sum(get_text_width(
                word['text'], 50) for word in line) + (len(line) - 1) * word_spacing

            # Calculate starting x for centered alignment
            start_x = (video_width - line_width) / 2
            x_offset = 0

            for part in line:
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
                x_offset += get_text_width(part['text'], 50) + word_spacing

        base_y_position_numbers = 0.2
        line_height_offset = 0.05

        rank_colors = {
            1: 'gold',
            2: 'silver',
            3: '#CD7F32'  # Bronze/Brown
        }

        for i in range(len(moment_titles)):
            rank = i + 1
            number_y_ratio = base_y_position_numbers + (i * line_height_offset)
            color = rank_colors.get(rank, '#FFFFFF')  # Default to white

            text_configs.append({
                'text': f"{rank}.",
                'start_time': start_time,
                'duration': total_video_duration - start_time,
                'fontsize': 35,
                'y': f'h*{number_y_ratio}',
                'fontcolor': color,
                'x': '20'
            })

        current_cumulative_time = 0

        for i, title_info in enumerate(reversed(moment_titles)):
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

        processing_status[session_id].update(
            {'step': 'Adding text overlays...', 'progress': 80})
        font_file = "fonts/SpecialGothicExpandedOne-Regular.ttf"

        if not os.path.exists(font_file):
            font_file = "/System/Library/Fonts/Arial.ttf"
            if not os.path.exists(font_file):
                font_file = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
                if not os.path.exists(font_file):
                    font_file = "arial"

        add_text_ffmpeg(concatenated_output, final_output,
                        text_configs, font_file)

        if not os.path.exists(final_output):
            processing_status[session_id] = {
                'status': 'error', 'error': 'Text overlay processing failed'}
            return

        processing_status[session_id] = {
            'status': 'completed',
            'step': 'Processing complete!',
            'progress': 100,
            'download_url': f'/download/{session_id}'
        }

    except Exception as e:
        processing_status[session_id] = {'status': 'error', 'error': str(e)}
    except Exception as e:
        processing_status[session_id] = {'status': 'error', 'error': str(e)}
