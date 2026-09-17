# Spot Beach Bar — site + painel do administrador

Este projeto tem duas partes:

- **Site público**: o que os clientes veem.
  - `index.html` — Início: galeria de fotos do espaço, com descrição.
  - `pratos.html` — Pratos mais vendidos.
  - `bebidas.html` — Bebidas mais vendidas.
  - `esportes_lazer.html` — dias e horários em que a quadra está disponível.
  - `shows_eventos.html` — próximos shows (imagem, data e quem vai se apresentar).
  - `localizacao.html` — mapa interativo com a localização do bar.
- **Painel do administrador** (`public/admin/admin.html`): área protegida por
  senha onde só a equipe do bar cadastra, edita e exclui tudo isso.

Os dados ficam guardados em `data/db.json` (criado automaticamente na primeira
vez que o servidor roda) e as imagens enviadas ficam em `uploads/`.

## 1. Pré-requisitos

- [Node.js](https://nodejs.org/) instalado (versão 18 ou mais recente).

## 2. Instalar as dependências

Na pasta do projeto, rode:

```bash
npm install
```

## 3. Configurar a senha do administrador

Nunca deixe a senha em texto puro no projeto. Gere o hash dela com:

```bash
npm run set-admin-password -- "sua-senha-aqui"
```

Isso vai imprimir uma linha assim:

```
ADMIN_PASSWORD_HASH=$2a$10$....
```

1. Copie o arquivo `.env.example` e renomeie a cópia para `.env`.
2. Cole a linha `ADMIN_PASSWORD_HASH=...` gerada no `.env`, substituindo a que
   já está lá (vazia).
3. Troque também `SESSION_SECRET` por qualquer frase longa e aleatória.

## 4. Rodar o servidor

```bash
npm start
```

O site fica em: **http://localhost:3000**
O painel do administrador fica em: **http://localhost:3000/admin/admin.html**

> ⚠️ **Importante:** se a porta 3000 já estiver sendo usada por outro
> programa/projeto no seu computador (por exemplo, algo que já estava
> rodando de antes), o navegador pode acabar mostrando o site *desse outro
> programa* em vez do Spot Beach — e aí nada daqui funciona direito. Se algo
> parecer "errado demais" (aparência diferente, botões diferentes), confira
> no terminal se apareceu a mensagem `Spot Beach rodando em
> http://localhost:3000` sem nenhum erro de porta em uso antes dela. Se
> precisar, feche outros processos Node abertos e rode `npm start` de novo.

## 5. Usando o painel

O painel tem 6 abas, na mesma ordem da barra lateral do site:

- **Início**: fotos do espaço (deck, área dos shows, etc.) com título e
  descrição — isso é o que aparece na página inicial.
- **Pratos** / **Bebidas**: nome, descrição, preço e imagem.
- **Esportes e Lazer**: marque os dias em que a quadra fica disponível e
  escreva o horário de cada um (ex: "14h às 22h"). Dias desmarcados aparecem
  como "Fechada" no site.
- **Shows e Eventos**: nome do evento, quem vai se apresentar, data e
  imagem/cartaz.
- **Localização**: endereço (texto), latitude/longitude e uma descrição
  extra. As coordenadas definem onde o marcador aparece no mapa da página
  "Localização" — para pegar as coordenadas certas, abra o
  [Google Maps](https://maps.google.com), clique com o botão direito no
  local exato e copie os dois números que aparecem no topo do menu.

Para editar algo (foto, prato, bebida ou show), clique em "Editar" na lista —
o formulário é preenchido automaticamente. Para trocar só a imagem, escolha
um novo arquivo; os outros campos podem ficar como estão. Ao excluir um item,
a imagem associada a ele também é apagada do servidor.

Shows com data no passado somem sozinhos da página "Shows e Eventos" — mas
continuam no painel até você decidir excluí-los.

## 6. Sobre o mapa da página Localização

O mapa usa [Leaflet](https://leafletjs.com/) com mapas do OpenStreetMap — não
precisa de nenhuma chave de API paga. Ele carrega essas bibliotecas direto de
um CDN público, então é necessário que o computador de quem estiver
visitando o site tenha internet (o servidor em si continua rodando local).

## 7. Sobre o banco de dados

Por enquanto os dados ficam num arquivo `data/db.json` — simples e não exige
instalar nenhum servidor de banco. Se no futuro vocês quiserem migrar para
MySQL (por exemplo, reaproveitando a mesma estrutura do sistema contábil),
basta reescrever as funções `readDb`/`writeDb` em `db.js`; as rotas da API em
`server.js` continuam iguais.

## 8. Estrutura de pastas

```
spot-beach-admin/
├── server.js              → servidor Express e rotas da API
├── db.js                  → leitura/escrita do "banco" (data/db.json)
├── scripts/
│   └── set-admin-password.js
├── data/
│   └── db.json             → criado automaticamente
├── uploads/                → imagens enviadas pelo admin (criado automaticamente)
└── public/
    ├── index.html + styles.css              → Início (galeria do espaço)
    ├── pratos.html + pratos.css
    ├── bebidas.html + bebidas.css
    ├── esportes_lazer.html + esportes_lazer.css
    ├── shows_eventos.html + shows_eventos.css
    ├── localizacao.html + localizacao.css
    ├── assets/logo.jpeg
    ├── js/site.js           → busca os dados na API para as páginas públicas
    └── admin/
        ├── admin.html        → as 6 abas do painel
        ├── admin.css
        └── admin.js          → login, listar, criar, editar e excluir
```

## 9. Publicando o site (hospedagem)

Como agora existe um servidor Node.js rodando por trás (não é mais só
HTML/CSS estático), vocês vão precisar de uma hospedagem que rode Node —
serviços como Render, Railway ou um VPS simples funcionam bem para projetos
pequenos como esse. Ao hospedar, lembrem de configurar as variáveis de
ambiente do `.env` (especialmente `ADMIN_PASSWORD_HASH` e `SESSION_SECRET`)
diretamente no painel do serviço de hospedagem, e não subir o arquivo `.env`
para lugares públicos como o GitHub.
