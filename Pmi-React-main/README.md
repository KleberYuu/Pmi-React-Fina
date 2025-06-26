# **React + Vite + TypeScript Project**

## 📖 **Descrição**
Este projeto é uma aplicação web desenvolvida utilizando **React**, **Vite** e **TypeScript**, oferecendo uma base moderna e eficiente para criação de aplicações interativas e escaláveis. Ele foi projetado com uma estrutura organizada, que facilita o desenvolvimento, manutenção e expansão.

### 🔧 **Tecnologias utilizadas**
- **React**: Biblioteca para criação de interfaces de usuário reativas e dinâmicas.
- **Vite**: Ferramenta de desenvolvimento extremamente rápida e leve, ideal para projetos modernos.
- **TypeScript**: Superset do JavaScript que adiciona tipagem estática, melhorando a qualidade e segurança do código.
- **Material-UI (MUI)**: Framework de componentes para facilitar a estilização e o design da interface.

---

## 📂 **Estrutura do Projeto**
O projeto é organizado de maneira modular, seguindo as melhores práticas de desenvolvimento:

### **Pastas principais:**
- **`src`**: Diretório com os arquivos principais da aplicação.
  - **`assets`**: Contém imagens e outros arquivos estáticos usados no projeto.
  - **`components`**: Componentes reutilizáveis, como cabeçalhos e seções da interface.
  - **`pages`**: Arquivos correspondentes às páginas principais do projeto, como:
    - `DashboardPage.tsx`
    - `ForgotPasswordPage.tsx`
    - `HistoricoChavesPage.tsx`
    - `LoginPage.tsx`
    - `BuscarChavePage.tsx`
  - **`styles`**: Arquivos CSS para estilização personalizada das páginas e componentes.

### **Arquivos principais:**
- **`App.tsx`**: Componente raiz do React, responsável pela renderização geral do aplicativo.
- **`index.tsx`**: Ponto de entrada da aplicação.
- **`vite-env.d.ts`**: Configurações do ambiente TypeScript para Vite.

---

## ⚙️ **Funcionalidades**
- Navegação dinâmica entre páginas utilizando `react-router-dom`.
- Troca de abas interativas com gerenciamento de estado via hooks React (`useState`, `useNavigate`).
- Busca simulada de informações utilizando funções assíncronas.
- Componentes estilizados com **Material-UI** para uma experiência visual refinada.
- Sistema de carregamento e exibição de erros para melhor interação com o usuário.

---

## 🚀 **Como rodar o projeto**

### **Pré-requisitos**
Certifique-se de ter instalado:
- **Node.js** (versão 16 ou superior)
- **npm** ou **yarn**

### **Instalação**
1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   ```
2. Acesse o diretório do projeto:
   ```bash
   cd <nome-do-diretorio>
   ```
3. Instale as dependências:
   ```bash
   npm install
   ```

### **Credenciais de Acesso**
Para acessar o sistema, utilize as seguintes credenciais:
- **Email**: pmi@ads61.com
- **Senha**: pmi

### **Rodar o projeto**
Inicie o servidor de desenvolvimento com:
```bash
npm run dev
```
O aplicativo será aberto automaticamente no navegador em `http://localhost:3000` (ou na porta configurada).

---

## 🛠️ **Configurações adicionais**
### **Vite Configuração**
O arquivo `vite.config.ts` contém configurações específicas para o ambiente de desenvolvimento e produção. Certifique-se de ajustar conforme necessário.

### **TypeScript**
Os arquivos `tsconfig.json`, `tsconfig.app.json` e `tsconfig.node.json` garantem uma configuração refinada para melhor compatibilidade e segurança durante o desenvolvimento.

---

## 📖 **Licença**
Este projeto foi desenvolvido com foco em aprendizado e aprimoramento de habilidades de desenvolvimento web modernas. Sinta-se livre para contribuir e compartilhar melhorias.

