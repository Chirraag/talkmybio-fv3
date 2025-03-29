import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

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
    onChunkUploaded: (url: string, isFinal: boolean) => void,
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
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

      this.mediaRecorder = new MediaRecorder(muteStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for better quality
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);

          // Create a new blob from all chunks so far
          const fullBlob = new Blob(this.chunks, { type: mimeType });

          const chunk: RecordingChunk = {
            blob: fullBlob,
            number: this.chunkNumber++,
          };

          try {
            // Upload the chunk and get URL
            const url = await this.uploadChunk(chunk);
            this.onChunkUploaded(url, false); // Not final
          } catch (error) {
            console.error("Error uploading chunk:", error);
          }
        }
      };

      // Record in 5-second chunks for more frequent updates
      this.mediaRecorder.start(5000);
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }

  async stop(): Promise<string[]> {
    if (!this.mediaRecorder) {
      console.warn("[Recorder] Tried to stop before mediaRecorder was ready");
      return [];
    }

    if (this.audioTrack) {
      this.audioTrack.stop();
    }

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          console.log("[Recorder] onstop triggered, preparing final blob...");

          const finalBlob = new Blob(this.chunks, {
            type: this.mediaRecorder!.mimeType,
          });

          const finalChunk: RecordingChunk = {
            blob: finalBlob,
            number: -1,
          };

          const finalUrl = await this.uploadChunk(finalChunk);
          console.log("[Recorder] Final video uploaded:", finalUrl);
          
          // Update the session with the final video URL
          const storyRef = doc(db, "stories", this.storyId);
          await updateDoc(storyRef, {
            [`sessions.${this.sessionId}.videoUrl`]: finalUrl,
            [`sessions.${this.sessionId}.videoComplete`]: true
          });

          this.onChunkUploaded(finalUrl, true);
          resolve([finalUrl]);
        } catch (error) {
          console.error("[Recorder] Error uploading final video:", error);
          resolve([]);
        }
      };

      console.log("[Recorder] Calling .stop() on mediaRecorder");
      this.mediaRecorder!.stop();
    });
  }

  private async uploadChunk(chunk: RecordingChunk): Promise<string> {
    const chunkId = uuidv4();
    const isFinal = chunk.number === -1;
    const fileName = isFinal
      ? `recordings/${this.storyId}/${this.sessionId}/complete.webm`
      : `recordings/${this.storyId}/${this.sessionId}/chunks/chunk_${chunk.number}.webm`;

    const storageRef = ref(storage, fileName);

    try {
      // Set content type explicitly
      const metadata = {
        contentType: "video/webm",
      };

      // For final video, ensure it's uploaded with the correct metadata
      if (isFinal) {
        await uploadBytes(storageRef, chunk.blob, {
          ...metadata,
          customMetadata: { complete: "true" },
        });
      }
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading chunk:", error);
      throw error;
    }
  }
}