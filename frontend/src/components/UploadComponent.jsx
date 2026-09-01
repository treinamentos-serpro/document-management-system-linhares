import { useState } from 'react';

export default function UploadComponent({ disabled, onUpload }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      return;
    }

    setIsUploading(true);
    try {
      const wasUploaded = await onUpload(file);
      if (wasUploaded) {
        setFile(null);
        event.target.reset();
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="document-file">Arquivo</label>
      <input
        id="document-file"
        type="file"
        disabled={disabled || isUploading}
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />
      <button type="submit" disabled={disabled || !file || isUploading}>
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}