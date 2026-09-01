// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const path = require('node:path');
const { createDocumentsController } = require('./controllers/documents.controller');
const { createDocumentsRepository } = require('./repositories/documents.repository');
const { createDocumentsRouter } = require('./routes/documents.routes');
const { createDocumentsService } = require('./services/documents.service');

const PORT = process.env.PORT || 3000;

function createApp({
  storagePath = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage'),
  maxFileSizeBytes = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024),
} = {}) {
  if (!Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um numero inteiro positivo.');
  }

  const app = express();
  const documentsRepository = createDocumentsRepository({
    storagePath,
    maxFileSizeBytes,
  });
  const documentsService = createDocumentsService(documentsRepository);
  const documentsController = createDocumentsController(documentsService);

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(createDocumentsRouter(documentsController, documentsRepository.uploadSingle));
  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
