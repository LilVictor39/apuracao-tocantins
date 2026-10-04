# Apuração · Tocantins 2026

Painel pessoal de presidente (Brasil ou Tocantins), governador e senador (Tocantins), para o **1º turno de 4 de outubro de 2026**. HTML, CSS e JavaScript; sem dependências de execução, cadastro ou chave de API.

## Usar no computador

Com Node.js 20 ou superior, abra um terminal nesta pasta e execute:

```powershell
npm start
```

Abra **http://127.0.0.1:4173**. Mantenha o terminal aberto enquanto usa o painel. Para encerrar, pressione Ctrl+C. O servidor local aceita somente conexões do próprio computador. A versão publicada pode ser acessada pelo celular com a conta proprietária do site.

## Dados e comportamento

- Fonte: [documentação técnica do TSE](https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados), formato EA20.
- Eleições 6257 (federal) e 6259 (estadual), ambiente oficial, ciclo ele2026, cargos 0001, 0003 e 0005.
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

Testes de EA20, validação da eleição, percentuais, situações eleitorais, bloqueios e falhas HTTP. O Sites publica `dist/`, conforme `.openai/hosting.json`. O projeto permanece privado.
