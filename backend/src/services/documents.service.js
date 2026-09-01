const crypto = require('node:crypto');

function createError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function createDocumentsService(documentsRepository) {
  function validateOwner(owner) {
    if (typeof owner !== 'string' || !owner.trim()) {
      throw createError(
        'MISSING_USER_ID',
        'O header X-User-Id e obrigatorio.',
        400,
      );
    }

    return owner.trim();
  }

  function toPublicDocument(document) {
    const { storedName, ...publicDocument } = document;
    return publicDocument;
  }

  return {
    createDocument(owner, file) {
      const validOwner = validateOwner(owner);

      if (!file) {
        throw createError('MISSING_FILE', 'O campo file e obrigatorio.', 400);
      }

      const document = {
        id: crypto.randomUUID(),
        originalName: file.originalname,
        storedName: file.filename,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner: validOwner,
      };

      return toPublicDocument(documentsRepository.save(document));
    },
    listDocuments(owner) {
      const validOwner = validateOwner(owner);
      return documentsRepository
        .findByOwner(validOwner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
        .map(toPublicDocument);
    },
    getDocumentForDownload(id, owner) {
      const validOwner = validateOwner(owner);
      const document = documentsRepository.findByIdAndOwner(id, validOwner);

      if (!document) {
        throw createError(
          'DOCUMENT_NOT_FOUND',
          'Documento nao encontrado.',
          404,
        );
      }

      const filePath = documentsRepository.getFilePath(document);
      if (!documentsRepository.fileExists(filePath)) {
        throw createError(
          'DOCUMENT_NOT_FOUND',
          'Documento nao encontrado.',
          404,
        );
      }

      return { document, filePath };
    },
  };
}

module.exports = { createDocumentsService };