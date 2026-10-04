# Apuração · Tocantins 2026

Painel pessoal de presidente (Brasil ou Tocantins), governador, senador e deputado estadual (Tocantins), para o **1º turno de 4 de outubro de 2026**. HTML, CSS e JavaScript; sem dependências de execução, cadastro ou chave de API.

## Usar no computador

Com Node.js 20 ou superior, abra um terminal nesta pasta e execute:

```powershell
npm start
```

Abra **http://127.0.0.1:4173**. Mantenha o terminal aberto enquanto usa o painel. Para encerrar, pressione Ctrl+C. O servidor local aceita somente conexões do próprio computador. A versão publicada pode ser acessada pelo celular com a conta proprietária do site.

## Ver no celular

No computador, rode `npm run phone` (a partir da pasta `resultado` ou desta). O terminal mostra um endereço `http://192.168.x.x:4173`: abra-o no celular conectado ao **mesmo Wi-Fi**. No Windows, permita o acesso em rede privada se o firewall perguntar. Para abrir como app, use "Adicionar à tela inicial" no navegador. O celular consulta o TSE diretamente; o PC só serve os arquivos.

## Extras

- **Tema claro/escuro:** o seletor no topo permite escolher Automático, Claro ou Escuro. A escolha fica salva neste navegador; Automático acompanha a preferência do celular ou computador.
- **Mapa municipal:** ao abrir a seção, carrega a malha simplificada do IBGE e os 139 municípios do cadastro oficial EA12 do TSE. Depois que houver votos para o cargo selecionado, consulta os arquivos municipais EA20 gradualmente e colore cada área pelo candidato mais votado. Há busca, lista acessível e atualização manual; falhas e ausência de votos não são mostradas como liderança.
- **Comparativo com 2022:** mostra os dois mais votados para Presidente no Tocantins no 1º turno de 2022 (Lula: 434.303 votos, 50,40%; Jair Bolsonaro: 379.194 votos, 44,00%) ao lado da parcial de 2026 no mesmo recorte. A diferença entre os dois primeiros é mostrada separadamente em cada eleição; candidaturas de anos diferentes não são tratadas como equivalentes. Fontes: [Dados Abertos do TSE](https://dadosabertos.tse.jus.br/dataset/resultados-2022) e [tabela histórica publicada no Senado](https://legis.senado.leg.br/sdleg-getter/documento/download/f4c65065-2827-4b25-b3ae-cea632a47ef9).
- **Gatinhos reativos:** os gatos se assustam quando muda quem lidera um cargo e comemoram quando a totalização chega a 100%. A reação visual funciona mesmo com os alertas desligados e respeita a preferência por movimento reduzido. O primeiro dado recebido serve de referência e não dispara reação.
- **Margem:** diferença em votos e p.p. entre 1º e 2º (no Senado, entre quem ocupa a última vaga e o primeiro fora dela).
- **Maioria absoluta:** para governador e presidente (nacional), mostra se o líder passa de 50% dos votos válidos, usando o percentual publicado pelo TSE. Uma marca vermelha indica os 50% nas barras. Não se aplica ao Senado nem ao recorte estadual do presidente.
- **Evolução:** gráfico dos percentuais a cada totalização, registrado pelo navegador (localStorage) enquanto o painel está aberto. Não é série oficial do TSE.
- **Alertas** (botão no topo da lista): aviso sonoro, na tela e, quando permitido, notificação do sistema nos marcos de 50%, 90% e 100% das seções e quando muda quem lidera (só a partir de 10% das seções, para evitar ruído). Com alertas ligados o painel continua consultando em segundo plano e tenta manter a tela acesa; no celular, bloquear a tela ou fechar o navegador interrompe as consultas. O primeiro dado recebido serve só de referência e não gera alerta.
- **Deputado estadual:** mostra os mais votados durante a parcial e destaca as candidaturas marcadas como eleitas pelo TSE na totalização. A lista completa fica em “Ver outras candidaturas”. A eleição é proporcional; a ordem geral de votos não determina sozinha as 24 vagas. Para esse cargo, os alertas cobrem os marcos de totalização, sem avisos de mudança de liderança ou margem da última vaga.

## Dados e comportamento

- Fonte: [documentação técnica do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados), formato EA20.
- Eleições 6257 (federal) e 6259 (estadual), ambiente oficial, ciclo ele2026, cargos 0001, 0003, 0005 e 0007.
- Consultas diretas pelo navegador a cada 30 segundos; pausadas em abas em segundo plano ou pelo controle Automático.
- HTTP 404 e formato inesperado: pausa de cinco minutos; 403/429: pausa global mínima de dez minutos. Erros de rede têm espera crescente.
- O armazenamento local conserva a última resposta válida e a preferência de abrangência. Resultados restaurados ou sem atualização recebem aviso de consulta anterior.
- Dados simulados, outra eleição, outro turno ou outra abrangência são recusados. Não existem resultados fictícios no site. Os dados sintéticos dos testes ficam fora de `dist/`.
- Situações eleitorais vêm do campo `st` do TSE; `e=s` sozinho não significa eleito. O recorte de presidente no Tocantins não declara resultado nacional.
- Percentuais dos candidatos são os publicados pela fonte; votos anulados e sub judice mantêm a destinação indicada. Seções totalizadas não são sinônimo de eleitores ou votos apurados.
- A totalização e a geração do arquivo têm horários próprios, separados do horário da consulta. Indisponibilidade da fonte não é apresentada como zero votos.
- Este painel cobre o primeiro turno. Um segundo turno exige reconfigurar os códigos e validar os arquivos correspondentes.

## Verificação

```powershell
npm test
```

Testes de extras (margem, maioria, marcos, histórico, gráfico) e de EA20, validação da eleição, percentuais, situações eleitorais, bloqueios e falhas HTTP. O Sites publica `dist/`, conforme `.openai/hosting.json`. O projeto permanece privado.
