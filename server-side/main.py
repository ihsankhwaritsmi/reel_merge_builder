import subprocess
import os

def concatenate_videos(video_paths, output_path):
    """Concatenate multiple videos into one using ffmpeg."""
    with open("concat_list.txt", "w") as f:
        for path in video_paths:
            f.write(f"file '{os.path.abspath(path)}'\n")

    command = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "concat_list.txt",
        "-c", "copy",
        output_path
    ]
    subprocess.run(command, check=True)
    os.remove("concat_list.txt")

def add_text_ffmpeg(input_video, output_video, text_configs, font_file):
    """Add text overlays to a video using ffmpeg."""
    filter_complex = []
    import re

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
        "-i", input_video,
        "-vf", ",".join(filter_complex),
        "-c:a", "copy",
        output_video
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except subprocess.CalledProcessError as e:
        print("ffmpeg error:")
        print(e.stderr)
        raise
