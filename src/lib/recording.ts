import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

interface RecordingChunk {
  blob: Blob;
  number: number;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private storyId: string;
  private sessionId: string;
  private onChunkUploaded: (url: string, isFinal: boolean) => void;
  private chunkNumber = 0;
  private audioTrack: MediaStreamTrack | null = null;

  constructor(
    storyId: string, 
    sessionId: string,
    onChunkUploaded: (url: string, isFinal: boolean) => void
  ) {
    this.storyId = storyId;
    this.sessionId = sessionId;
    this.onChunkUploaded = onChunkUploaded;
  }

  async start(stream: MediaStream) {
    try {
      // Create a new stream with only video track
      const videoTrack = stream.getVideoTracks()[0];
      const muteStream = new MediaStream([videoTrack]);

      // Store audio track reference
      this.audioTrack = stream.getAudioTracks()[0];
      
      // Check for WebM support with VP8 codec
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm';

      this.mediaRecorder = new MediaRecorder(muteStream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps for better quality
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          
          // Create a new blob from all chunks so far
          const fullBlob = new Blob(this.chunks, { type: mimeType });
          
          const chunk: RecordingChunk = {
            blob: fullBlob,
            number: this.chunkNumber++
          };
          
          try {
            // Upload the chunk and get URL
            const url = await this.uploadChunk(chunk);
            this.onChunkUploaded(url, false); // Not final
          } catch (error) {
            console.error('Error uploading chunk:', error);
          }
        }
      };

      // Record in 5-second chunks for more frequent updates
      this.mediaRecorder.start(5000);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stop(): Promise<string[]> {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder not initialized');
    }

    // Stop audio track if it exists
    if (this.audioTrack) {
      this.audioTrack.stop();
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          // Create final blob from all chunks
          const finalBlob = new Blob(this.chunks, { 
            type: this.mediaRecorder!.mimeType 
          });

          // Upload final video
          const finalChunk: RecordingChunk = {
            blob: finalBlob,
            number: -1 // Special number for final video
          };

          const finalUrl = await this.uploadChunk(finalChunk);
          this.onChunkUploaded(finalUrl, true); // Final video
          resolve([finalUrl]);
        } catch (error) {
          console.error('Error uploading final video:', error);
          resolve([]);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  private async uploadChunk(chunk: RecordingChunk): Promise<string> {
    const chunkId = uuidv4();
    const isFinal = chunk.number === -1;
    
    // Use a more descriptive filename pattern
    const fileName = isFinal 
      ? `complete_${chunkId}.webm` 
      : `chunk_${chunk.number}_${chunkId}.webm`;
    
    const path = `recordings/${this.storyId}/${this.sessionId}/${fileName}`;
    const storageRef = ref(storage, path);

    try {
      // Set content type explicitly
      const metadata = {
        contentType: 'video/webm',
      };

      await uploadBytes(storageRef, chunk.blob, metadata);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading chunk:', error);
      throw error;
    }
  }
}