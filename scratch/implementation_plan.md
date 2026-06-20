# Migração do Processamento de Arquivos para Segundo Plano (Cloud Functions)

O objetivo desta alteração é transferir todo o processamento pesado de planilhas (Operacional, Billing, CapCar, BSC) que atualmente acontece no navegador do usuário para o servidor utilizando **Firebase Cloud Functions**. Isso permitirá que o upload do arquivo seja quase instantâneo e o usuário possa continuar utilizando o aplicativo enquanto o processamento ocorre no backend.

## User Review Required

> [!WARNING]
> **Configuração do Firebase Cloud Functions**
> Para que esta arquitetura funcione, o seu projeto do Firebase precisará estar no plano **Blaze (Pay as you go)**, pois o Google exige esse plano para utilizar as funções de backend (Cloud Functions), mesmo que o uso mensal fique dentro da cota gratuita. Por favor, confirme se o projeto está ou pode ser migrado para o plano Blaze.
> 
> Além disso, instalaremos o SDK do `firebase-admin` e do `firebase-functions` no repositório.

## Open Questions

1. **Plano Blaze:** O seu projeto do Firebase já está no plano Blaze (Pay as you go)? (Obrigatório para Cloud Functions em Node.js).
2. **Notificações:** Durante o processamento em segundo plano, como você gostaria de visualizar o status? (ex: Uma barra lateral/notificação no sistema que mostra "Processando Operacional: 202606Q1..." e que avisa quando estiver "Concluído" ou "Erro").
3. **CORS e Storage:** Teremos que configurar as regras do Firebase Storage para permitir uploads diretos do cliente. Isso já está liberado ou podemos configurar?

## Proposed Changes

A estratégia adotada será:

1. **Frontend (`DataImporter.jsx`)**: 
   - Ao invés de usar o `Papaparse` ou `xlsx` no frontend, o botão de "Processar" e "Salvar" será unificado.
   - O arquivo selecionado pelo usuário será diretamente enviado para o **Firebase Storage** em uma pasta temporária (ex: `imports/operacional_202606Q1.csv`).
   - Um registro será criado no Firestore em uma nova coleção chamada `import_jobs`, com o status "pendente".
   - O aplicativo monitorará o status desse documento para exibir se foi "sucesso" ou "erro", sem prender o usuário na tela.

2. **Backend (Firebase Cloud Functions)**:
   - Inicializaremos a estrutura `/functions` no repositório.
   - Criaremos uma função acionada pelo Firebase Storage (`onObjectFinalized`) ou uma função chamada manualmente via HTTP Callable que receberá o caminho do arquivo no Storage.
   - A função fará o download do arquivo para a memória do servidor, processará as linhas exatamente com as mesmas lógicas de PROCV (buscando o mapa de rotas no Firestore) e mapeará todas as colunas para o campo `dados_originais`.
   - Como os limites gratuitos do Firebase permitem muitas gravações, o backend salvará os dados em **Chunks / Lotes** no banco usando `batch()` para substituir a quinzena antiga e inserir a nova de forma rápida e atômica.
   - Ao terminar, a função atualizará o registro em `import_jobs` para "concluído".

### Components e Arquivos a Serem Modificados

#### [NEW] `functions/index.js`
- Toda a lógica de parseamento pesada será extraída do `DataImporter.jsx` e convertida para rodar em Node.js usando `csv-parser` e `xlsx`.
- A lógica de limpar quinzenas e inserir novos documentos será rodada via `firebase-admin`.

#### [MODIFY] `src/DataImporter.jsx`
- Remoção das bibliotecas pesadas de parsing do lado do cliente (melhora no desempenho geral do site).
- Troca da lógica para fazer upload via `uploadBytesResumable` no Storage do Firebase.
- Inclusão do sistema de acompanhamento da importação em tempo real (Notificações de status).

#### [NEW] `firestore.rules` & `storage.rules`
- Caso necessário, ajustarei as regras para garantir que os arquivos e relatórios de processo (jobs) tenham as permissões corretas para gravação.

## Verification Plan

### Testes Manuais
- Fazer upload de uma planilha pequena Operacional.
- Sair da tela do Importer e verificar se a notificação de processamento aparece.
- Validar no dashboard se os dados, gráficos e o campo `dados_originais` (acessível no Firebase) foram populados idênticos ao código antigo.
- Testar a sobreposição: reimportar a mesma quinzena e garantir que ela substitui a antiga sem duplicar dados.
