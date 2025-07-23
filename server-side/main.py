import subprocess
import os
import tempfile

def concatenate_videos(video_paths, output_path):
    """
    Concatenates multiple videos into one using ffmpeg.
    """
    # Create a temporary file to list the videos to concatenate
    with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as tmpfile:
        for path in video_paths:
            # Use absolute paths and escape single quotes
            abs_path = os.path.abspath(path).replace("'", "'\\''")
            tmpfile.write(f"file '{abs_path}'\n")
        list_file_path = tmpfile.name

    try:
        # Construct and run the ffmpeg command
        command = [
            "ffmpeg",
            "-f", "concat",
            "-safe", "0",
            "-i", list_file_path,
            "-c", "copy",
            output_path,
            "-y"  # Overwrite output file if it exists
        ]
        print("Running command:", " ".join(command))
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print("ffmpeg stdout:", result.stdout)
        print("ffmpeg stderr:", result.stderr)
    except subprocess.CalledProcessError as e:
        print("Error during video concatenation.")
        print("ffmpeg stdout:", e.stdout)
        print("ffmpeg stderr:", e.stderr)
        raise
    finally:
        # Clean up the temporary file
        os.remove(list_file_path)

def add_text_ffmpeg(input_video, output_video, text_configs, font_file):
    """
    Adds text overlays to a video using ffmpeg's drawtext filter.
    """
    # Construct the filter complex string from text_configs
    filter_complex = []
    for config in text_configs:
        text = config['text'].replace("'", "\\'").replace(":", "\\:")
        start = config['start_time']
        # duration = config['duration']
        # end = start + duration
        fontsize = config['fontsize']
        y_ratio = config['y_ratio']
        
        # Base drawtext filter
        drawtext_filter = f"drawtext=text='{text}':fontfile='{font_file}':fontsize={fontsize}:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5"
        
        # Positioning
        x_pos = config.get('x', '(w-text_w)/2')
        y_pos = f'h*{y_ratio}'
        
        drawtext_filter += f":x={x_pos}:y={y_pos}"
        
        # Timing
        drawtext_filter += f":enable='between(t,{start},3600)'" # Assuming a long video max duration
        
        filter_complex.append(drawtext_filter)

    # Join all filters
    filter_string = ",".join(filter_complex)

    # Construct and run the ffmpeg command
    command = [
        "ffmpeg",
        "-i", input_video,
        "-vf", filter_string,
        "-codec:a", "copy",
        output_video,
        "-y"  # Overwrite output file if it exists
    ]
    
    try:
        print("Running command:", " ".join(command))
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print("ffmpeg stdout:", result.stdout)
        print("ffmpeg stderr:", result.stderr)
    except subprocess.CalledProcessError as e:
        print("Error during text overlay processing.")
        print("ffmpeg stdout:", e.stdout)
        print("ffmpeg stderr:", e.stderr)
        raise