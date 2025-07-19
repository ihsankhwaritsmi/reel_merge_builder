import subprocess
import os

def concatenate_videos(input_video_paths, output_path):
    """
    Concatenates multiple video files into a single output video using FFmpeg.

    Parameters:
    - input_video_paths: A list of paths to the input video files (list of str).
    - output_path: The path to save the concatenated video (str).
    """
    # Create a temporary file listing the input videos
    list_file_path = "input_videos.txt"
    with open(list_file_path, "w") as f:
        for video_path in input_video_paths:
            f.write(f"file '{video_path}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_file_path,
        "-c", "copy",
        output_path
    ]

    try:
        subprocess.run(cmd, check=True)
        print(f"✅ Videos successfully concatenated to {output_path}.")
    except subprocess.CalledProcessError as e:
        print("❌ An error occurred while concatenating videos.")
        print(e)
    finally:
        # Clean up the temporary list file
        if os.path.exists(list_file_path):
            os.remove(list_file_path)

def add_text_ffmpeg(input_path, output_path, text_configs, font_path):
    """
    Adds multiple text overlays to a video using FFmpeg.

    Parameters:
    - input_path: Path to the input video (str).
    - output_path: Path to save the output video (str).
    - text_configs: A list of dictionaries, each containing:
        - 'text': The text string to display.
        - 'start_time': When the text should start appearing (in seconds).
        - 'duration': How long the text should be displayed (in seconds).
        - 'fontsize': Font size (optional, default 50).
        - 'y_ratio': Vertical position relative to video height (optional, default 0.12).
    - font_path: Path to the TTF font file (str).
    """
    vf_filters = []
    for config in text_configs:
        text = config['text']
        start_time = config.get('start_time', 0)
        duration = config.get('duration', 5)
        fontsize = config.get('fontsize', 50)
        y_ratio = config.get('y_ratio', 0.12)
        end_time = start_time + duration

        # More robust escaping for FFmpeg drawtext filter
        # Escape backslashes first, then single quotes, then other special characters
        escaped_text = text.replace('\\', '\\\\')
        escaped_text = escaped_text.replace("'", "\\'")
        escaped_text = escaped_text.replace(':', '\\:')
        escaped_text = escaped_text.replace(',', '\\,')
        escaped_text = escaped_text.replace('[', '\\[')
        escaped_text = escaped_text.replace(']', '\\]')
        escaped_text = escaped_text.replace('(', '\\(')
        escaped_text = escaped_text.replace(')', '\\)')
        escaped_text = escaped_text.replace('\n', '\\n') # Newlines are already handled, but keep for consistency

        # Determine x position. Use 'x' from config if provided, otherwise default to w*0.05
        x_pos = config.get('x', "w*0.05")

        filter_str = (
            f"drawtext=fontfile='{font_path}':"
            f"text='{escaped_text}':"
            f"fontcolor=white:fontsize={fontsize}:"
            f"x={x_pos}:y=h*{y_ratio}:"
            f"bordercolor=black:borderw=2:" # Added black border with width 2
            f"enable='between(t,{start_time},{end_time})'"
        )
        vf_filters.append(filter_str)

    cmd = [
        "ffmpeg", "-y", "-i", input_path,
        "-vf", ",".join(vf_filters),
        "-c:a", "copy",
        output_path
    ]

    try:
        subprocess.run(cmd, check=True)
        print("✅ Text(s) successfully added to video.")
    except subprocess.CalledProcessError as e:
        print("❌ An error occurred while adding text to video.")
        print(e)

if __name__ == "__main__":
    video_dir = "reels"
    input_videos = [os.path.join(video_dir, f"video{i}.mp4") for i in range(1, 6)]
    concatenated_output = "concatenated_reels.mp4"
    final_output = "final_reels_with_titles.mp4"
    font_file = "SpecialGothicExpandedOne-Regular.ttf"

    # Step 1: Concatenate videos
    concatenate_videos(input_videos, concatenated_output)

    if not os.path.exists(concatenated_output):
        print("Concatenation failed. Exiting.")
    else:
        print("\n--- Reels Editing App CLI ---")
        main_title = input("Enter the main title for 'Top 5 Moments': ")
        moment_titles = []
        for i in range(1, 6):
            title = input(f"Enter title for Moment {i}: ")
            moment_titles.append(title)

        text_configs = []

        # Get duration of each video to calculate start times for sequential titles
        video_durations = []
        for video_path in input_videos:
            try:
                # Use ffprobe to get video duration
                result = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", video_path],
                    capture_output=True, text=True, check=True
                )
                video_durations.append(float(result.stdout.strip()))
            except subprocess.CalledProcessError as e:
                print(f"Error getting duration for {video_path}: {e}")
                video_durations.append(10) # Default to 10 seconds if error

        total_video_duration = sum(video_durations)

        while True:
            try:
                start_time_overall_text = float(input("Enter the start time (in seconds) for the main title: "))
                break
            except ValueError:
                print("Invalid input. Please enter a number for start time.")
        
        # Add main title config
        text_configs.append({
            'text': main_title,
            'start_time': start_time_overall_text,
            'duration': total_video_duration - start_time_overall_text, # Make it stay on screen until the end
            'fontsize': 50, # Larger font for main title
            'y_ratio': 0.1 # Higher position for main title
        })

        # Static list of numbers (1., 2., etc.) that appear at the beginning and stay on screen
        base_y_position_numbers = 0.2 # Starting y_ratio for the first number
        line_height_offset = 0.05 # Vertical spacing between lines

        for i in range(len(moment_titles)):
            number_y_ratio = base_y_position_numbers + (i * line_height_offset)
            text_configs.append({
                'text': f"{i+1}.",
                'start_time': start_time_overall_text, # Numbers appear at the main title's start time
                'duration': total_video_duration - start_time_overall_text, # Numbers stay until end
                'fontsize': 35,
                'y_ratio': number_y_ratio
            })

        # Individual clip titles that appear incrementally
        current_cumulative_time = 0
        title_x_offset_ratio = 0.12 # Adjust this to position titles after numbers (corrected margin)

        for i, title in enumerate(moment_titles):
            title_y_ratio = base_y_position_numbers + (i * line_height_offset)
            
            text_configs.append({
                'text': title, # Only the title, no number
                'start_time': current_cumulative_time, # This title appears when its corresponding clip starts
                'duration': total_video_duration - current_cumulative_time, # Stays until end
                'fontsize': 35,
                'y_ratio': title_y_ratio,
                'x': f"w*{title_x_offset_ratio}" # Position titles slightly to the right of numbers
            })
            
            # Update cumulative time for the next clip
            current_cumulative_time += video_durations[i]
        add_text_ffmpeg(concatenated_output, final_output, text_configs, font_file)

        print(f"\nProcessing complete. Final video saved as: {final_output}")
