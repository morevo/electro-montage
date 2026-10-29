import { apiClient } from './client';

export const uploadApi = {
  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<{
      filename: string;
      originalName: string;
      mimeType: string;
      size: number;
      width: number;
      height: number;
      url: string;
    }>('/upload/photo', formData);
  },
};