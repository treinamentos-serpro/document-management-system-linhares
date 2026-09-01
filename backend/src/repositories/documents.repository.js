const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

function createDocumentsRepository({ storagePath, maxFileSizeBytes }) {
  fs.mkdirSync(storagePath, { recursive: true });

  const documents = [];
  const storage = multer.diskStorage({
    destination: storagePath,
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: maxFileSizeBytes },
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
      return path.join(storagePath, document.storedName);
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