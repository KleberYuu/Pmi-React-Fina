import app from "./app.js";
import dotenv from "dotenv";
import dbPool from "./config/database.js";

dotenv.config();

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Recebido SIGINT. Fechando o servidor...");
  try {
    await dbPool.end();
    console.log("Conexões do banco de dados fechadas.");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao fechar conexões do banco de dados:", err.message);
    process.exit(1);
  }
});
