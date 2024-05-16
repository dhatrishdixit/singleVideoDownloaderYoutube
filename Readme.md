# YouTube Video Downloader

YouTube Video Downloader is a simple tool that lets you download videos and audio from YouTube at your desired quality. It supports very high-quality downloads, including 4K video, and always downloads audio at the highest available quality. This tool utilizes `ffmpeg` and `ytdl-core` as its base technologies.

## Features

- Download videos in various qualities (360p, 480p, 720p, 1080p,1440p, 4K).
- Download audio in the highest available quality.
- Easy to use with a command-line interface.

## Installation

You can install YouTube Video Downloader via npm from the [npm registry](https://www.npmjs.com/package/ytvdownload).

```bash
   npm i ytvdownload
```

now to run the executable
 
```bash
   npx ytvdownload
```

## Steps
-  Enter the Video URL: When prompted, enter the URL of the YouTube video you want to download.
-  Enter the Folder Location: Specify the folder location where you want to save the video or audio.
- Choose Download Option:
- Enter v to download the video.
- Enter a to download the audio as an M4A file.
- Select Video Quality (if downloading video): Choose the desired video quality from the available options.


The tool will handle the rest, downloading and processing the media files to your specified location.

## Example (for video)
```bash
$ npx ytvdownload
Enter the video URL: https://www.youtube.com/watch?v=example
Enter the folder location to save video or audio: /path/to/save
Do you want to download video or audio? (v/a): v
Available target video qualities:
0: 360p
1: 480p
2: 720p
3: 1080p
4: 4K
Select the desired target video quality (index): 3
Downloading video and audio...
```

