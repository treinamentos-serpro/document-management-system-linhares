const multer = require('multer');

function sendError(response, error, fallbackCode, fallbackMessage) {
  const status = error.status || 500;
  response.status(status).json({
    error: {
      code: error.code || fallbackCode,
      message: error.message || fallbackMessage,
    },
  });
}

function createDocumentsController(documentsService) {
  return {
    upload(request, response) {
      try {
        const document = documentsService.createDocument(
          request.get('X-User-Id'),
          request.file,
        );
        response.status(201).json(document);
      } catch (error) {
        sendError(response, error, 'UPLOAD_FAILED', 'Falha ao enviar o documento.');
      }
    },
    list(request, response) {
      try {
        response.json(documentsService.listDocuments(request.get('X-User-Id')));
      } catch (error) {
        sendError(
          response,
          error,
          'DOCUMENT_LIST_FAILED',
          'Falha ao listar os documentos.',
        );
      }
    },
    download(request, response) {
      try {
        const { document, filePath } = documentsService.getDocumentForDownload(
          request.params.id,
          request.get('X-User-Id'),
        );
        response.download(filePath, document.originalName, (error) => {
          if (error && !response.headersSent) {
            sendError(response, error, 'DOWNLOAD_FAILED', 'Falha ao baixar o documento.');
          }
        });
      } catch (error) {
        sendError(response, error, 'DOWNLOAD_FAILED', 'Falha ao baixar o documento.');
      }
    },
    handleUploadError(error, request, response, next) {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return response.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'O arquivo ultrapassa o tamanho maximo permitido.',
          },
        });
      }

      return response.status(400).json({
        error: {
          code: 'INVALID_MULTIPART_REQUEST',
          message: 'A requisicao multipart e invalida.',
        },
      });
    },
  };
}

module.exports = { createDocumentsController };