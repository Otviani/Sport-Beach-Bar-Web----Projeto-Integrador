# Spot Beach 🏖️

Site de divulgação do **Sport Beach Bar**, um bar/espaço de lazer, com painel administrativo para gerenciamento de conteúdo. Projeto desenvolvido com a cooperação dos alunos do 2° ano de Sistemas de Informação do Unifeb de Barretos-SP.

## 📋 Sobre o projeto

O site tem como objetivo apresentar o Spot Beach para o público, mostrando os pratos e bebidas oferecidos, os shows e eventos programados, a estrutura de esportes e lazer (quadra de beach tênis) e a localização do bar. Além disso, conta com um painel de administrador restrito, onde o dono do bar pode gerenciar o conteúdo exibido no site sem precisar mexer no código.

## ✨ Funcionalidades

- **Início**: galeria de fotos do espaço.
- **Pratos mais vendidos**: listagem com imagem e descrição de cada prato.
- **Bebidas mais vendidas**: listagem com imagem e descrição de cada bebida.
- **Shows e eventos**: página dedicada com os próximos shows (imagem, data e artista/atração).
- **Esportes e lazer**: agenda semanal editável da quadra de beach tênis (dias e horários).
- **Localização**: página com mapa interativo do bar.
- **Painel administrativo**: acesso restrito ao administrador, permitindo cadastrar, editar e excluir pratos, bebidas e shows (removendo eventos antigos e adicionando os futuros).

## 🎨 Interface

- Aba lateral de navegação com logo do local e botões (Início, Pratos mais vendidos, Bebidas mais vendidas, Shows e Eventos, Esportes e Lazer, Localização).
- Botões com efeito hover em laranja com leve iluminação branca, `border-radius` de 20px e transição suave de 0.5s.
- Painel principal com imagem de fundo, título de boas-vindas em laranja escuro e subtítulo em branco.
- Transições suaves entre páginas, com o conteúdo aparecendo de forma gradual ("descendo devagar").

## 🛠️ Tecnologias utilizadas

- **HTML5**
- **CSS3** (arquivo `home.css` compartilhado + arquivos de estilo próprios por página, como `pratos.css` e `bebidas.css`)
- **JavaScript**
- **Node.js** (backend do painel administrativo)
- **Banco de dados MySQL**

## 📁 Estrutura do projeto

```
sport-beach-admin/
├── index.html              # Galeria de fotos do espaço
├── pratos.html
├── bebidas.html
├── shows_eventos.html
├── esportes_lazer.html
├── localizacao.html
├── admin/                  # Painel administrativo
├── css/
│   ├── home.css          # Estilos compartilhados
│   ├── pratos.css
│   └── bebidas.css
├── js/
├── img/
└── README.md
```

> Ajuste a estrutura acima conforme a organização real das pastas do seu repositório.

## 🚀 Como executar o projeto

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Acesse a pasta do projeto
cd sport-beach-admin

# Instale as dependências do backend (painel administrativo)
npm install

# Inicie o servidor
npm start
```

O site estará disponível em `http://localhost:3000` (ou na porta configurada).

> ⚠️ Caso a porta 3000 já esteja em uso por outro processo Node no seu computador, o navegador pode acabar servindo um site diferente. Verifique se a porta está livre antes de iniciar o servidor.

## 🔒 Painel administrativo

O painel é de acesso restrito, disponível apenas para o administrador do bar, e permite:
- Cadastrar, editar e excluir pratos e bebidas (com imagem e descrição).
- Cadastrar, editar e excluir shows (com imagem, data e nome do artista), removendo eventos antigos e adicionando os futuros.
- Editar a agenda semanal da quadra de esportes e lazer.

## 👥 Autores

- Vinicius
