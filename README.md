<a id="inicio"></a>

<p align="center">
  <img src="docs/assets/readme/capa.svg" alt="Miaupuração — de olho nos votos e no seu cursor. Brasil inteiro no mapa, Tocantins em destaque." width="100%">
</p>

<p align="center">
  <img src="docs/assets/readme/badge-turnos.svg" alt="Turnos: primeiro e segundo" height="32">
  <img src="docs/assets/readme/badge-estados.svg" alt="Presidente: 27 unidades da federação" height="32">
  <img src="docs/assets/readme/badge-municipios.svg" alt="Tocantins: 139 municípios" height="32">
  <img src="docs/assets/readme/badge-fonte.svg" alt="Fonte: TSE" height="32">
</p>

<p align="center">
  <a href="#painel">O painel</a> &nbsp;·&nbsp;
  <a href="#executar">Como usar</a> &nbsp;·&nbsp;
  <a href="#recursos">Recursos</a> &nbsp;·&nbsp;
  <a href="#dados">Dados e atualização</a> &nbsp;·&nbsp;
  <a href="#estrutura">Arquivos</a> &nbsp;·&nbsp;
  <a href="#verificar">Verificação</a>
</p>

---

<a id="painel"></a>

## 01 · Uma apuração sob a supervisão dos bigodes

**Miaupuração** é um painel pessoal para acompanhar as Eleições 2026 com dados publicados pelo Tribunal Superior Eleitoral (TSE). O Brasil inteiro aparece na disputa presidencial, enquanto **Tocantins permanece em destaque** nos resultados e nos mapas. Os gatinhos acompanham a votação e reagem às mudanças.

| Turno | O que aparece |
| :--- | :--- |
| **2º turno · 25/10** | Presidente no Brasil e nas 27 unidades da federação; Governador do Tocantins; mapa nacional por estado e mapa tocantinense por município. |
| **1º turno · 04/10** | Presidente, Governador, Senador e Deputado Estadual; mapa municipal do Tocantins e comparativo presidencial com 2022. |

> **Antes da divulgação dos votos:** o 2º turno mostra as candidaturas confirmadas, sem preencher resultados fictícios. As consultas aos arquivos dessa votação só começam após as **17h de 25 de outubro, no horário de Brasília**.

O site é feito com HTML, CSS e JavaScript. Para executá-lo localmente, basta ter Node.js; não há cadastro, chave de API nem banco de dados para configurar. A [versão publicada](https://apuracao-tocantins-2026.victordamata197071.chatgpt.site) é privada e exige acesso da conta proprietária.

<a id="executar"></a>

## 02 · Do repositório para a tela

### No computador

Instale **Node.js 20 ou superior**, abra um terminal na pasta `apuracao-tocantins` e execute:

```powershell
npm start
```

Abra **http://127.0.0.1:4173**. Mantenha o terminal aberto durante o uso; pressione **Ctrl+C** para encerrar. Se estiver na pasta raiz `resultado`, o mesmo `npm start` encaminha o comando para este projeto. Não é necessário executar `npm install`.

### No celular, pela rede local

No computador, execute a partir desta pasta ou da raiz do repositório:

```powershell
npm run phone
```

O terminal mostrará um endereço como `http://192.168.x.x:4173`. Abra-o no celular conectado ao **mesmo Wi-Fi**. No Windows, permita acesso à rede privada caso o firewall pergunte. Para deixar um atalho na tela inicial, use a opção **Adicionar à tela inicial** do navegador.

O computador serve os arquivos do site; o navegador do celular consulta o TSE diretamente. A versão publicada dispensa manter o computador ligado.

<a id="recursos"></a>

## 03 · O que você encontra no painel

| Recurso | Como funciona |
| :--- | :--- |
| **Brasil por estado** | Lista e mapa mostram quem lidera para Presidente em cada uma das 27 unidades da federação. Tocantins ganha destaque próprio. |
| **Tocantins por município** | Mapa dos 139 municípios, com busca, lista acessível e cor para o mais votado. Áreas sem votos ficam neutras; empate tem cor própria. |
| **Tema claro e escuro** | Um botão anima o sol virando lua. O tema claro é o padrão na primeira visita, e a escolha fica salva no navegador. |
| **Comparativo com 2022** | Compara apenas Presidente no Tocantins, no **1º turno** de cada eleição, sem tratar candidatos de anos diferentes como equivalentes. |
| **Gatinhos reativos** | Reagem quando muda quem lidera ou quando a totalização chega a 100%; respeitam a preferência por movimento reduzido. |
| **Alertas opcionais** | Podem avisar sobre troca de liderança e sobre 50%, 90% e 100% das seções totalizadas. |

<details>
<summary><strong>Veja como ler os números e os alertas</strong></summary>

- **Margem:** diferença de votos e pontos percentuais entre os dois primeiros. No Senado, usa a última vaga e o primeiro candidato fora dela.
- **Maioria absoluta:** para Governador e Presidente no recorte nacional, indica quando o líder ultrapassa 50% dos votos válidos publicados pelo TSE. A barra marca esse limite; o recorte estadual de Presidente não decide a eleição nacional.
- **Deputado estadual:** a eleição é proporcional. O painel lista os mais votados na parcial e destaca quem o TSE marcar como eleito na totalização; a ordem geral de votos não determina sozinha as 24 vagas.
- **Evolução:** o gráfico registra no navegador os percentuais vistos a cada totalização enquanto o painel está aberto. Esse histórico local não é uma série oficial do TSE.
- **Alertas:** som, aviso na tela e, quando permitido, notificação do sistema. A troca de liderança só gera alerta depois de 10% das seções; para Deputado Estadual, os alertas cobrem apenas os marcos de totalização. O primeiro dado recebido serve de referência e não dispara aviso ou reação.
- **Turnos:** resultados, alertas e histórico local ficam separados por turno. Senado e Deputado Estadual permanecem no 1º turno.

</details>

<a id="dados"></a>

## 04 · De onde vêm os dados e quando mudam

| Parte do painel | Frequência de consulta |
| :--- | :--- |
| **Cargos principais** | A cada **30 segundos** com atualização automática ativa. |
| **Presidente por estado** | Os outros 26 estados são consultados um de cada vez, no máximo a cada **5 minutos**, enquanto a lista ou o mapa do Brasil estiver aberto. Tocantins acompanha o painel principal. |
| **Mapa municipal** | Os arquivos municipais são consultados gradualmente depois da divulgação dos votos, com reaproveitamento dos dados recentes e botão de atualização manual. |

É **atualização periódica**, não transmissão instantânea. A aba em segundo plano normalmente pausa as consultas; com alertas ligados, o painel tenta continuar. No celular, bloquear a tela ou fechar o navegador interrompe as consultas. O botão **Atualizar** permite pedir uma nova leitura quando disponível.

Os resultados vêm dos [arquivos públicos do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados), no formato EA20. Os mapas usam [malhas simplificadas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3). O site usa cache local e carrega estados e municípios sob demanda; para este painel pessoal, isso dispensa um serviço de ingestão e um banco Supabase.

<details>
<summary><strong>Detalhes técnicos das eleições e da validação</strong></summary>

- **1º turno:** eleições `6257` (federal) e `6259` (estadual), cargos `0001`, `0003`, `0005` e `0007`.
- **2º turno:** eleições `6258` (federal) e `6260` (estadual), cargos `0001` e `0003`. Ambiente oficial, ciclo `ele2026`.
- O painel recusa arquivo simulado, outra eleição, turno, cargo ou abrangência. Falhas e votos ainda não divulgados não aparecem como zero ou como liderança.
- Respostas HTTP `404` e formatos inesperados provocam uma pausa de cinco minutos; `403` e `429`, uma pausa global mínima de dez minutos. Erros de rede têm espera crescente.
- Situações eleitorais vêm do campo `st` do TSE; `e=s` sozinho não indica eleição. A totalização de seções não é a contagem de eleitores ou votos apurados.
- Percentuais, destinação de votos anulados ou sub judice e horários de totalização seguem os dados publicados pela fonte. Dados restaurados do cache ou sem atualização recebem aviso de consulta anterior.

</details>

### O comparativo de 2022

No 1º turno de Presidente no Tocantins em 2022, os dois mais votados foram **Lula (434.303 votos; 50,40%)** e **Jair Bolsonaro (379.194 votos; 44,00%)**. O painel compara esse recorte com a parcial de 2026 no mesmo estado e turno, mostrando a diferença entre os dois primeiros separadamente em cada ano. Fontes: [Dados Abertos do TSE](https://dadosabertos.tse.jus.br/dataset/resultados-2022) e [tabela histórica publicada no Senado](https://legis.senado.leg.br/sdleg-getter/documento/download/f4c65065-2827-4b25-b3ae-cea632a47ef9).

<a id="estrutura"></a>

## 05 · Cada arquivo tem seu papel

| Caminho | Função |
| :--- | :--- |
| [`dist/index.html`](dist/index.html) | Estrutura da página e controles. |
| [`dist/app.js`](dist/app.js) e [`dist/tse.js`](dist/tse.js) | Atualização do painel, endereços e validação dos resultados do TSE. |
| [`dist/brasil.js`](dist/brasil.js) e [`dist/br-malha.geojson`](dist/br-malha.geojson) | Lista e mapa dos estados; malha nacional do IBGE. |
| [`dist/map.js`](dist/map.js), [`dist/to-malha.geojson`](dist/to-malha.geojson) e [`dist/to-municipios.json`](dist/to-municipios.json) | Mapa e cadastro dos municípios tocantinenses. |
| [`dist/theme.js`](dist/theme.js), [`dist/theme.css`](dist/theme.css) e [`dist/cats.js`](dist/cats.js) | Tema e reações dos gatinhos. |
| [`dist/history.js`](dist/history.js) e [`dist/extras.js`](dist/extras.js) | Comparativo, gráficos, margens e alertas. |
| [`server.mjs`](server.mjs) e [`package.json`](package.json) | Servidor local e comandos de execução. |
| [`tests/`](tests/) | Testes dos resultados e dos recursos. |
| [`docs/assets/readme/`](docs/assets/readme/) | Capa, selos e rodapé deste README. |

O Sites publica apenas `dist/`, conforme [`.openai/hosting.json`](.openai/hosting.json). O projeto publicado permanece privado.

<a id="verificar"></a>

## 06 · Confira antes de acompanhar

Execute os testes a partir desta pasta:

```powershell
npm test
```

Eles cobrem, entre outros pontos, validação dos arquivos EA20, cargos e turnos, percentuais, situações eleitorais, alertas, mapas, histórico, bloqueios e falhas HTTP.

<details>
<summary><strong>Se algo não carregar</strong></summary>

| Sintoma | O que conferir |
| :--- | :--- |
| `npm` não é reconhecido | Instale Node.js 20 ou superior e reabra o terminal. |
| A página local não abre | Confirme que `npm start` continua em execução e abra `http://127.0.0.1:4173`. |
| O celular não encontra o painel | Use `npm run phone`, confira se ambos estão no mesmo Wi-Fi e autorize a rede privada no firewall. |
| Ainda não há votos do 2º turno | A divulgação só começa depois do fechamento da votação; o painel não inventa parcial. |
| Dados não mudam | Verifique a conexão, o controle **Automático**, o horário da última totalização e os avisos de pausa da fonte. |

</details>

### Créditos visuais

A bandeira de Tocantins usada no site foi baseada no [vetor em domínio público do Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bandeira_do_Tocantins.svg). As ilustrações deste README seguem as cores e os gatinhos do próprio painel.

---

<p align="center">
  <img src="docs/assets/readme/rodape.svg" alt="Miaupuração — dados do TSE, fiscalização felina." width="100%">
</p>

<p align="center">
  <a href="https://apuracao-tocantins-2026.victordamata197071.chatgpt.site">Abrir site privado</a> &nbsp;·&nbsp;
  <a href="#executar">Executar localmente</a> &nbsp;·&nbsp;
  <a href="#inicio">Voltar ao início ↑</a>
</p>
