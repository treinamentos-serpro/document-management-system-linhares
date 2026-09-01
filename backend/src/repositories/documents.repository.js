const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

function createDocumentsRepository({ storagePath, maxFileSizeBytes }) {
  fs.mkdirSync(storagePath, { recursive: true });
  const resolvedStoragePath = path.resolve(storagePath);

  const documents = [];
  const storage = multer.diskStorage({
    destination: storagePath,
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: maxFileSizeBytes,
      files: 1,
      fields: 10,
      parts: 11,
      fieldSize: 10 * 1024,
    },
  });

  return {
    uploadSingle: upload.single('file'),
    save(document) {
      documents.push(document);
      return document;
    },
    findByOwner(owner) {
      return documents.filter((document) => document.owner === owner);
    },
    findByIdAndOwner(id, owner) {
      return documents.find(
        (document) => document.id === id && document.owner === owner,
      );
    },
    getFilePath(document) {
      const filePath = path.resolve(resolvedStoragePath, document.storedName);
      if (!filePath.startsWith(`${resolvedStoragePath}${path.sep}`)) {
        throw new Error('Nome interno de arquivo invalido.');
      }
      return filePath;
    },
    fileExists(filePath) {
      return fs.existsSync(filePath);
    },
    removeFile(filePath) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    },
  };
}

module.exports = { createDocumentsRepository };