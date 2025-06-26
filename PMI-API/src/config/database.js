import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_DATABASE || "pmi",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

pool
  .getConnection()
  .then((connection) => {
    console.log("Conectado ao banco de dados MySQL com sucesso!");
    connection.release();
  })
  .catch((err) => {
    console.error("Erro ao conectar ao banco de dados:", err.message);
    // process.exit(1);
  });

export default pool;
