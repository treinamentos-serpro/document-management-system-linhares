# Especificação - Document Management System

## 1. Objetivo

Disponibilizar um sistema web de gestão de documentos que permita a cada usuário identificado enviar, listar e baixar exclusivamente os seus próprios arquivos, mantendo-os no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição HTTP.
- Armazenamento físico de arquivos no servidor local.
- Criação e manutenção em memória dos metadados dos documentos durante a execução da aplicação.
- Listagem dos documentos pertencentes ao usuário identificado na requisição.
- Download de um documento pelo identificador, desde que pertença ao usuário identificado.
- Endpoint de verificação de saúde do backend.
- Interface React para os fluxos de envio, listagem e download, em etapa posterior de implementação.

### Fora do escopo

- Cadastro, autenticação, autorização real ou gestão de contas de usuários.
- Banco de dados ou persistência de metadados após reinício da aplicação.
- Armazenamento externo, serviços em nuvem ou provedores de upload de terceiros.
- Edição, exclusão, restauração ou versionamento de documentos.
- Compartilhamento de documentos entre usuários.
- Pesquisa textual, categorização, etiquetas ou paginação.
- Verificação antivírus, OCR, assinatura digital ou conversão de arquivos.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve expor `GET /health` e responder que o serviço está disponível. |
| RF-02 | O sistema deve receber um documento por `POST /upload` em `multipart/form-data`, no campo obrigatório `file`. |
| RF-03 | O sistema deve exigir o header `X-User-Id` não vazio para upload, listagem e download. |
| RF-04 | O sistema deve aceitar qualquer tipo de arquivo com tamanho máximo de 10 MB. |
| RF-05 | Ao receber um upload válido, o sistema deve gerar um identificador único, gravar o arquivo no armazenamento local e registrar seus metadados em memória. |
| RF-06 | O sistema deve preservar o nome original do arquivo somente como metadado e utilizar um nome interno seguro e único no filesystem. |
| RF-07 | O sistema deve listar, em `GET /documents`, apenas os metadados dos documentos pertencentes ao usuário informado em `X-User-Id`. |
| RF-08 | O sistema deve ordenar a listagem por data de upload decrescente, do documento mais recente para o mais antigo. |
| RF-09 | O sistema deve permitir, em `GET /documents/:id/download`, o download somente de documento pertencente ao usuário informado em `X-User-Id`. |
| RF-10 | O sistema não deve revelar a existência de documento de outro usuário; acesso a ID inexistente ou não pertencente ao solicitante deve retornar a mesma resposta `404`. |
| RF-11 | O cliente web deve consumir os endpoints do backend pelo prefixo `/api` configurado no proxy do Vite. |
| RF-12 | O cliente web deve informar ao usuário os resultados de upload, listagem, download e falhas de comunicação. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados exclusivamente no filesystem local em `backend/storage`, por meio de `multer` configurado com `diskStorage`. |
| RNF-02 | Os metadados devem permanecer somente em memória nesta fase; reiniciar a aplicação descarta a lista de documentos, sem tentar recuperá-la. |
| RNF-03 | O backend deve seguir Clean Architecture simples, com fluxo de dependência `routes -> controllers -> services -> repositories`. |
| RNF-04 | Controllers devem concentrar detalhes HTTP e validação de entrada; regras de negócio devem residir nos services; persistência de metadados e arquivos deve residir nos repositories. |
| RNF-05 | Configurações devem ser lidas de variáveis de ambiente, com valores padrão documentados quando aplicável, em conformidade com 12-Factor App. |
| RNF-06 | O backend deve usar Node.js, Express e CommonJS; o frontend deve usar React, Vite e módulos ESM. |
| RNF-07 | Símbolos de código devem usar inglês; mensagens ao usuário e comentários devem usar português. |
| RNF-08 | Erros de entrada, filesystem e HTTP devem ser tratados nos limites do sistema e retornados em formato JSON padronizado quando a resposta não for um arquivo. |
| RNF-09 | Testes de backend devem utilizar o runner nativo `node:test` e cobrir os contratos e regras de posse especificados. |

## 5. Modelo de dados (metadados do documento)

### Entidade `Document`

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | UUID gerado pelo sistema para identificar o documento publicamente. |
| `originalName` | string | Sim | Nome do arquivo informado pelo cliente no upload. |
| `storedName` | string | Sim | Nome interno, único e seguro do arquivo no filesystem. Não é exposto pela API pública. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Data e hora de conclusão do upload no formato ISO 8601 em UTC. |
| `owner` | string | Sim | Identificador do proprietário, obtido do header `X-User-Id`. |

### Regras de integridade

- `id` deve ser único enquanto a aplicação estiver em execução.
- `owner` deve ser uma string não vazia após remoção de espaços nas extremidades.
- `originalName` é exibido e usado para sugerir o nome do download; ele não deve compor caminhos de filesystem.
- `storedName` deve ser gerado pelo servidor e não pode ser aceito do cliente.
- O repositório deve manter uma coleção em memória de `Document` e uma referência ao arquivo correspondente em `backend/storage`.
- Como não há persistência de metadados, arquivos que permaneçam no disco após reinicialização não estarão disponíveis para listagem ou download até que haja uma evolução de persistência fora deste escopo.

## 6. Contratos de API

### Convenções gerais

- Base da API: `/api` para o cliente web, encaminhado pelo proxy ao backend; os caminhos abaixo representam os endpoints do backend.
- Identificação do usuário: o header `X-User-Id` é obrigatório nas operações sobre documentos. Ele é uma identificação temporária do MVP, não um mecanismo de autenticação.
- Datas são retornadas como strings ISO 8601 em UTC.
- Respostas JSON usam `Content-Type: application/json; charset=utf-8`.
- Respostas de erro JSON seguem o formato:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Mensagem legível em português."
  }
}
```

### GET /health

Verifica se o backend está disponível.

**Resposta de sucesso: `200 OK`**

```json
{
  "status": "ok"
}
```

### POST /upload

Recebe e registra um documento para o usuário solicitante.

**Headers obrigatórios**

| Header | Valor |
| --- | --- |
| `X-User-Id` | String não vazia que identifica o proprietário. |

**Corpo da requisição**

- Tipo: `multipart/form-data`.
- Campo obrigatório: `file`.
- Tipos aceitos: qualquer tipo de arquivo.
- Tamanho máximo: `10485760` bytes (10 MB).

**Resposta de sucesso: `201 Created`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 248392,
  "uploadedAt": "2026-09-01T14:30:00.000Z",
  "owner": "user-123"
}
```

**Falhas esperadas**

| Status | Código | Quando ocorre |
| --- | --- | --- |
| `400 Bad Request` | `MISSING_USER_ID` | `X-User-Id` ausente, vazio ou formado apenas por espaços. |
| `400 Bad Request` | `MISSING_FILE` | Campo `file` ausente. |
| `400 Bad Request` | `INVALID_MULTIPART_REQUEST` | Corpo não segue `multipart/form-data` válido. |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | O arquivo ultrapassa 10 MB. |
| `500 Internal Server Error` | `UPLOAD_FAILED` | Falha inesperada ao gravar o arquivo ou registrar metadados. |

Em caso de falha após a criação do arquivo físico e antes do registro do metadado, a implementação deve tentar remover o arquivo parcial para evitar resíduos desnecessários.

### GET /documents

Lista os documentos pertencentes ao usuário solicitante.

**Headers obrigatórios**

| Header | Valor |
| --- | --- |
| `X-User-Id` | String não vazia que identifica o proprietário. |

**Resposta de sucesso: `200 OK`**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 248392,
    "uploadedAt": "2026-09-01T14:30:00.000Z",
    "owner": "user-123"
  }
]
```

A resposta deve ser um array, inclusive quando vazia, e não deve incluir `storedName`.

**Falhas esperadas**

| Status | Código | Quando ocorre |
| --- | --- | --- |
| `400 Bad Request` | `MISSING_USER_ID` | `X-User-Id` ausente, vazio ou formado apenas por espaços. |
| `500 Internal Server Error` | `DOCUMENT_LIST_FAILED` | Falha inesperada ao consultar os metadados. |

### GET /documents/:id/download

Baixa um documento pertencente ao usuário solicitante.

**Parâmetros de caminho**

| Parâmetro | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID do documento a ser baixado. |

**Headers obrigatórios**

| Header | Valor |
| --- | --- |
| `X-User-Id` | String não vazia que identifica o proprietário. |

**Resposta de sucesso: `200 OK`**

- Corpo: conteúdo binário original do arquivo.
- `Content-Type`: tipo MIME conhecido do arquivo, ou `application/octet-stream` quando indisponível.
- `Content-Disposition`: `attachment` com o nome original do arquivo, devidamente tratado para cabeçalho HTTP.

**Falhas esperadas**

| Status | Código | Quando ocorre |
| --- | --- | --- |
| `400 Bad Request` | `MISSING_USER_ID` | `X-User-Id` ausente, vazio ou formado apenas por espaços. |
| `404 Not Found` | `DOCUMENT_NOT_FOUND` | ID inexistente, documento de outro usuário ou arquivo físico indisponível. |
| `500 Internal Server Error` | `DOWNLOAD_FAILED` | Falha inesperada ao preparar ou transmitir o arquivo. |

## 7. Decisões arquiteturais

### Arquitetura do backend

O backend adota uma Clean Architecture simples. O fluxo de dependências é estritamente:

```text
routes -> controllers -> services -> repositories
```

| Camada | Responsabilidade |
| --- | --- |
| `routes/` | Define os caminhos HTTP, associa middlewares e encaminha cada requisição ao controller apropriado. |
| `controllers/` | Lê parâmetros, headers e arquivos da requisição; executa validações HTTP básicas; mapeia resultados e erros para respostas HTTP. |
| `services/` | Aplica regras de negócio: valida usuário, coordena upload, gera UUID, filtra por proprietário, ordena resultados e decide acesso ao download. |
| `repositories/` | Persiste e consulta metadados em memória, interage com o filesystem local e encapsula o `multer.diskStorage`. |

`multer` atua na borda de entrada HTTP para processar `multipart/form-data`, mas sua configuração de destino e nome interno deve permanecer sob responsabilidade de infraestrutura/persistência. A camada de service não deve depender de objetos `req` ou `res`; repositories não devem depender de controllers ou routes.

### Armazenamento local

- Diretório padrão: `backend/storage`.
- Mecanismo obrigatório: `multer` com `diskStorage`.
- O diretório deve existir ou ser criado no início da aplicação antes de aceitar uploads.
- A localização pode ser configurada por `STORAGE_PATH`; quando ausente, usa o diretório padrão acima.
- O nome gravado deve ser interno e único. A API nunca expõe caminho absoluto, caminho relativo ou `storedName`.
- Não serão utilizados S3, banco de dados, CDN, provedores de upload ou qualquer serviço externo.

### Configuração

| Variável | Obrigatória | Valor padrão | Finalidade |
| --- | --- | --- | --- |
| `PORT` | Não | `3000` | Porta HTTP do backend. |
| `STORAGE_PATH` | Não | `backend/storage` | Diretório local dos arquivos enviados. |
| `MAX_FILE_SIZE_BYTES` | Não | `10485760` | Limite de tamanho por arquivo em bytes. |

Valores inválidos para configurações numéricas devem impedir a inicialização com mensagem clara no log, em vez de produzir comportamento indefinido em runtime.

### Arquitetura do frontend

O cliente será organizado em `pages/`, `components/` e `services/`:

- `pages/` coordena a tela principal de gestão de documentos.
- `components/` concentra elementos reutilizáveis de formulário, listagem, estado de carregamento e mensagens de erro.
- `services/` encapsula chamadas `fetch` para `/api` e interpreta respostas de erro.

A identificação temporária do usuário poderá ser mantida no estado do cliente e enviada como `X-User-Id` em cada chamada. Ela não substitui autenticação real e deve ser tratada como uma limitação do MVP.

## 8. Plano de execução

Este plano descreve etapas de implementação futura. Ele não executa nem determina alterações em arquivos específicos de backend ou frontend nesta especificação.

1. **Consolidar configuração e convenções**: definir a leitura das variáveis `PORT`, `STORAGE_PATH` e `MAX_FILE_SIZE_BYTES`, preparar o diretório local e documentar como executar os serviços no ambiente de desenvolvimento.
2. **Estabelecer persistência local**: implementar o repositório de metadados em memória, a estratégia de nome interno seguro e a integração de armazenamento local com `multer.diskStorage`.
3. **Implementar regras de negócio**: criar serviços para validar o proprietário, registrar o documento, listar por dono em ordem decrescente e localizar arquivo para download sem expor documentos alheios.
4. **Expor contratos HTTP**: criar controllers e rotas para saúde, upload, listagem e download; aplicar o contrato de erros e traduzir erros do `multer`, validação e filesystem para os status definidos.
5. **Construir a experiência web**: disponibilizar uma tela React para informar o usuário do MVP, enviar arquivos, consultar a lista própria e iniciar downloads por meio do prefixo `/api`.
6. **Cobrir com testes**: adicionar testes automatizados de saúde, upload válido, validações de `X-User-Id` e `file`, limite de tamanho, isolamento entre usuários, ordenação, download válido e resposta indistinguível para documento ausente ou de outro dono.
7. **Validar e documentar a operação**: executar testes e build disponíveis, confirmar que nenhum serviço externo é utilizado, verificar o comportamento de reinicialização e atualizar a documentação de uso e limitações do MVP.
