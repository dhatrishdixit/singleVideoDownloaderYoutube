const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const readline = require('readline');
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const ProgressBar = require('progress');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt user for video URL
rl.question('Enter the video URL: ', async (videoUrl) => {
  // Prompt user for folder location
  rl.question('Enter the folder location to save video: ', async (folderLocation) => {
    try {
      const videoInfo = await ytdl.getInfo(videoUrl);
      const videoTitle = videoInfo.videoDetails.title.replace(/[\\/?><%*:|"]/g, '-');
      const filePath = path.join(folderLocation, `${videoTitle}.mp4`);

      // Create the folder if it doesn't exist
      if (!fs.existsSync(folderLocation)) {
        fs.mkdirSync(folderLocation, { recursive: true });
      }

      // Check if the file already exists
      if (fs.existsSync(filePath)) {
        rl.question(`File '${filePath}' already exists. Do you want to overwrite? (y/n): `, (answer) => {
          if (answer.toLowerCase() === 'y') {
            downloadAndMergeVideo(videoUrl, filePath, videoInfo);
          } else {
            process.stdout.write('Skipping video download.\n');
            rl.close();
          }
        });
      } else {
        downloadAndMergeVideo(videoUrl, filePath, videoInfo);
      }
    } catch (error) {
      console.error('An error occurred:', error);
      rl.close();
    }
  });
});

// Function to download and merge video
function downloadAndMergeVideo(videoUrl, filePath, videoInfo) {
  process.stdout.write(`Downloading video: ${videoInfo.videoDetails.title}\n`);

  // Create progress bars
  const audioBar = new ProgressBar('Audio Download [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: 100
  });

  const videoBar = new ProgressBar('Video Download [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: 100
  });

  const mergingBar = new ProgressBar('Merging Progress [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: 100
  });

  // Download audio stream
  const audio = ytdl(videoUrl, { quality: 'highestaudio' }).on('progress', (_, downloaded, total) => {
    audioBar.update(downloaded / total);
  });

  // Download video stream
  const video = ytdl(videoUrl, { quality: 'highestvideo' }).on('progress', (_, downloaded, total) => {
    videoBar.update(downloaded / total);
  });

  // Spawn ffmpeg process to merge audio and video
  const ffmpegProcess = cp.spawn(ffmpeg, [
    '-loglevel', '8', '-hide_banner',
    '-progress', 'pipe:3',
    '-i', 'pipe:4', '-i', 'pipe:5',
    '-map', '0:a', '-map', '1:v',
    '-c:v', 'copy', '-y', filePath
  ], {
    windowsHide: true,
    stdio: ['inherit', 'inherit', 'inherit', 'pipe', 'pipe', 'pipe']
  });

  // Update merging progress bar based on ffmpeg output
  ffmpegProcess.stdio[3].on('data', (chunk) => {
    const progress = chunk.toString().trim().split('=')[1];
    if (progress) {
      const progressValue = parseFloat(progress);
      mergingBar.update(progressValue / 100);
    }
  });

  // Handle ffmpeg process completion
  ffmpegProcess.on('close', () => {
    process.stdout.write('\nMerging finished!\n');
    rl.close();
  });

  // Handle ffmpeg process errors
  ffmpegProcess.on('error', (error) => {
    console.error('Error during the merging process:', error);
    rl.close();
  });

  // Pipe audio and video streams to ffmpeg process
  audio.pipe(ffmpegProcess.stdio[4]);
  video.pipe(ffmpegProcess.stdio[5]);
}