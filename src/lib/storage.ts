import { storage } from './firebase';
import { ref, getDownloadURL } from 'firebase/storage';

export const getImageWithToken = async (path: string): Promise<string> => {
  try {
    // Get a reference to the file
    const imageRef = ref(storage, path);
    
    // Get the download URL with token
    const url = await getDownloadURL(imageRef);
    
    // Create a new Image object to handle the loading
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Enable CORS
      
      img.onload = () => {
        // Create a canvas to convert the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image and convert to base64
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // Set the source URL last
      img.src = url;
    });
  } catch (error) {
    console.error('Error getting image URL:', error);
    throw error;
  }
};