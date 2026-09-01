import { useState } from 'react';

export default function DownloadButton({ disabled, document, onDownload }) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleClick() {
    setIsDownloading(true);
    try {
      await onDownload(document);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button type="button" disabled={disabled || isDownloading} onClick={handleClick}>
      {isDownloading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}