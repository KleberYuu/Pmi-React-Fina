import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js"; // Certifique-se que o caminho é correto e termina com `.js`!

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes); // /api/register será tratado aqui

export default app;
