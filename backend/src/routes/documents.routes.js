const express = require('express');

function createDocumentsRouter(documentsController, uploadSingle) {
  const router = express.Router();

  router.post(
    '/upload',
    uploadSingle,
    documentsController.upload,
    documentsController.handleUploadError,
  );
  router.get('/documents', documentsController.list);
  router.get('/documents/:id/download', documentsController.download);

  return router;
}

module.exports = { createDocumentsRouter };