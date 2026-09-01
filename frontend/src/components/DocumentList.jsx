import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

export default function DocumentList({ documents, disabled, onDownload }) {
  if (!documents.length) {
    return <p>Nenhum documento enviado para este usuário.</p>;
  }

  return (
    <ul>
      {documents.map((document) => (
        <li key={document.id}>
          <strong>{document.originalName}</strong>
          <span> {formatFileSize(document.size)} | {new Date(document.uploadedAt).toLocaleString('pt-BR')}</span>
          <DownloadButton
            disabled={disabled}
            document={document}
            onDownload={onDownload}
          />
        </li>
      ))}
    </ul>
  );
}