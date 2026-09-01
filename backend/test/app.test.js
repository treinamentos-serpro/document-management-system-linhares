const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { createDocumentsService } = require('../src/services/documents.service');

async function createTestServer(t, options = {}) {
  const storagePath = mkdtempSync(path.join(tmpdir(), 'dms-test-'));
  const testApp = app.createApp({ storagePath, ...options });
  const server = testApp.listen();

  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  t.after(() => rmSync(storagePath, { recursive: true, force: true }));

  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

function createUploadForm(content, name = 'document.txt') {
  const formData = new FormData();
  formData.append('file', new Blob([content], { type: 'text/plain' }), name);
  return formData;
}

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('GET /health informa que o servico esta disponivel', async (t) => {
  const baseUrl = await createTestServer(t);
  const response = await fetch(`${baseUrl}/health`);

  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(await response.json(), { status: 'ok' });
});

test('POST /upload exige usuario e arquivo', async (t) => {
  const baseUrl = await createTestServer(t);
  const withoutUser = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('conteudo'),
  });
  const withoutFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-1' },
    body: new FormData(),
  });

  assert.strictEqual(withoutUser.status, 400);
  assert.strictEqual((await withoutUser.json()).error.code, 'MISSING_USER_ID');
  assert.strictEqual(withoutFile.status, 400);
  assert.strictEqual((await withoutFile.json()).error.code, 'MISSING_FILE');
});

test('upload, listagem e download mantem documentos isolados por usuario', async (t) => {
  const baseUrl = await createTestServer(t);
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-1' },
    body: createUploadForm('conteudo seguro', 'relatorio.txt'),
  });
  const document = await uploadResponse.json();

  assert.strictEqual(uploadResponse.status, 201);
  assert.strictEqual(document.originalName, 'relatorio.txt');
  assert.strictEqual(document.storedName, undefined);

  const ownerListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'user-1' },
  });
  assert.deepStrictEqual(await ownerListResponse.json(), [document]);

  const anotherUserListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'user-2' },
  });
  assert.deepStrictEqual(await anotherUserListResponse.json(), []);

  const deniedDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'user-2' },
  });
  assert.strictEqual(deniedDownload.status, 404);
  assert.strictEqual((await deniedDownload.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'user-1' },
  });
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.txt/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo seguro');
});

test('POST /upload rejeita arquivo acima do limite configurado', async (t) => {
  const baseUrl = await createTestServer(t, { maxFileSizeBytes: 3 });
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-1' },
    body: createUploadForm('maior que tres bytes'),
  });

  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
});

test('o servico remove o arquivo quando a persistencia do metadado falha', () => {
  let removedPath;
  const service = createDocumentsService({
    save() {
      throw new Error('Falha no repositorio');
    },
    removeFile(filePath) {
      removedPath = filePath;
    },
  });
  const file = {
    originalname: 'relatorio.txt',
    filename: 'arquivo-interno.txt',
    size: 10,
    path: '/tmp/arquivo-interno.txt',
  };

  assert.throws(() => service.createDocument('user-1', file), /Falha no repositorio/);
  assert.strictEqual(removedPath, file.path);
});
