import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentsApi.js';

export default function App() {
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Informe seu identificador para gerenciar documentos.');

  useEffect(() => {
    setDocuments([]);
    setMessage(userId.trim()
      ? 'Atualize a lista para consultar seus documentos.'
      : 'Informe seu identificador para gerenciar documentos.');
  }, [userId]);

  async function loadDocuments() {
    if (!userId.trim()) {
      setMessage('Informe seu identificador de usuário.');
      return;
    }

    setIsLoading(true);
    try {
      const listedDocuments = await listDocuments(userId.trim());
      setDocuments(listedDocuments);
      setMessage(`${listedDocuments.length} documento(s) encontrado(s).`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload(file) {
    try {
      const document = await uploadDocument(userId.trim(), file);
      setDocuments((currentDocuments) => [document, ...currentDocuments]);
      setMessage('Documento enviado com sucesso.');
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }

  async function handleDownload(document) {
    try {
      await downloadDocument(userId.trim(), document);
      setMessage(`Download de ${document.originalName} iniciado.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const hasUserId = Boolean(userId.trim());

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', margin: '0 auto', maxWidth: '44rem', padding: '2rem' }}>
      <h1>Document Management System</h1>
      <label htmlFor="user-id">Identificador do usuário</label>
      <input
        id="user-id"
        value={userId}
        onChange={(event) => setUserId(event.target.value)}
        placeholder="Ex.: user-123"
      />
      <button type="button" disabled={isLoading} onClick={loadDocuments}>
        {isLoading ? 'Atualizando...' : 'Atualizar lista'}
      </button>
      <p role="status">{message}</p>

      <section>
        <h2>Enviar documento</h2>
        <UploadComponent disabled={!hasUserId} onUpload={handleUpload} />
      </section>

      <section>
        <h2>Meus documentos</h2>
        <DocumentList
          disabled={!hasUserId || isLoading}
          documents={documents}
          onDownload={handleDownload}
        />
      </section>
    </main>
  );
}
