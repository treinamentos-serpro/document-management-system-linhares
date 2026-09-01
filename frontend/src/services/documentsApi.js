const API_BASE_URL = '/api';

async function getErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload.error?.message || 'Não foi possível concluir a operação.';
  } catch {
    return 'Não foi possível concluir a operação.';
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response;
}

function createUserHeaders(userId) {
  return { 'X-User-Id': userId };
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', {
    method: 'POST',
    headers: createUserHeaders(userId),
    body: formData,
  });

  return response.json();
}

export async function listDocuments(userId) {
  const response = await request('/documents', {
    headers: createUserHeaders(userId),
  });

  return response.json();
}

export async function downloadDocument(userId, document) {
  const response = await request(`/documents/${document.id}/download`, {
    headers: createUserHeaders(userId),
  });
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = window.document.createElement('a');

  link.href = objectUrl;
  link.download = document.originalName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}