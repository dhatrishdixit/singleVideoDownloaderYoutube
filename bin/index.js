#!/usr/bin/env node
process.removeAllListeners('warning');

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

      // List available video qualities
      const qualities = ['360p', '480p', '720p', '1080p', '4K'];
      console.log('Available target video qualities:');
      qualities.forEach((quality, index) => {
        console.log(`${index}: ${quality}`);
      });

      // Prompt user for desired video quality
      rl.question('Select the desired target video quality (index): ', (qualityIndex) => {
        const targetQuality = qualities[parseInt(qualityIndex, 10)];
        
        // Check if the file already exists
        if (fs.existsSync(filePath)) {
          rl.question(`File '${filePath}' already exists. Do you want to overwrite? (y/n): `, (answer) => {
            if (answer.toLowerCase() === 'y') {
              downloadAndProcessVideo(videoUrl, filePath, targetQuality);
            } else {
              process.stdout.write('Skipping video download.\n');
              rl.close();
            }
          });
        } else {
          downloadAndProcessVideo(videoUrl, filePath, targetQuality);
        }
      });
    } catch (error) {
      console.error('An error occurred:', error);
      rl.close();
    }
  });
});

// Function to download and process video
function downloadAndProcessVideo(videoUrl, filePath, targetQuality) {
  process.stdout.write(`Downloading video and audio...\n`);

  // Create progress bars
  const downloadBar = new ProgressBar('Download [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: 100
  });

  const processingBar = new ProgressBar('Processing [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 50,
    total: 100
  });

  // Download video stream
  const videoStream = ytdl(videoUrl, { quality: 'highestvideo' });
  const audioStream = ytdl(videoUrl, { quality: 'highestaudio' });

  const videoPath = path.join(path.dirname(filePath), `${path.basename(filePath, '.mp4')}_video.mp4`);
  const audioPath = path.join(path.dirname(filePath), `${path.basename(filePath, '.mp4')}_audio.mp4`);

  const videoFile = fs.createWriteStream(videoPath);
  const audioFile = fs.createWriteStream(audioPath);

  videoStream.pipe(videoFile);
  audioStream.pipe(audioFile);

  videoStream.on('progress', (_, downloaded, total) => {
    downloadBar.update(downloaded / total);
  });

  audioStream.on('progress', (_, downloaded, total) => {
    downloadBar.update(downloaded / total);
  });

  let videoFinished = false;
  let audioFinished = false;

  videoFile.on('finish', () => {
    videoFile.close();
    videoFinished = true;
    if (audioFinished) {
      mergeAndProcess(videoPath, audioPath, filePath, targetQuality, processingBar);
    }
  });

  audioFile.on('finish', () => {
    audioFile.close();
    audioFinished = true;
    if (videoFinished) {
      mergeAndProcess(videoPath, audioPath, filePath, targetQuality, processingBar);
    }
  });

  videoFile.on('error', (error) => {
    console.error('Error during video download:', error);
    rl.close();
  });

  audioFile.on('error', (error) => {
    console.error('Error during audio download:', error);
    rl.close();
  });
}

// Function to merge video and audio and upscale if necessary
function mergeAndProcess(videoPath, audioPath, outputPath, targetQuality, processingBar) {
  const resolutions = {
    '360p': '640x360',
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080',
    '4K': '3840x2160'
  };
  
  const targetResolution = resolutions[targetQuality];

  const ffmpegProcess = cp.spawn(ffmpeg, [
    '-i', videoPath,
    '-i', audioPath,
    '-vf', `scale=${targetResolution}`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-strict', 'experimental',
    '-y', outputPath
  ], {
    windowsHide: true,
    stdio: ['inherit', 'inherit', 'inherit', 'pipe']
  });

  ffmpegProcess.stdio[3].on('data', (chunk) => {
    const progress = chunk.toString().trim().split('=')[1];
    if (progress) {
      const progressValue = parseFloat(progress);
      processingBar.update(progressValue / 100);
    }
  });

  ffmpegProcess.on('close', () => {
    fs.unlinkSync(videoPath); // Remove the temporary video file
    fs.unlinkSync(audioPath); // Remove the temporary audio file
    console.log('Processing finished!');
    rl.close();
  });

  ffmpegProcess.on('error', (error) => {
    console.error('Error during the processing:', error);
    rl.close();
  });
}
