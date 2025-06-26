import React, { useState } from "react";
import "../styles/DashboardPage.css";
import { getContractByNumber } from "../utils/keyGenerator";
import axios from "axios";

interface ChaveEncontrada {
  contrato: string;
  chave: string;
}

const HistoricoChavePage: React.FC = () => {
  const [contractNumber, setContractNumber] = useState("");
  const [chaveEncontrada, setChaveEncontrada] =
    useState<ChaveEncontrada | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const handleSearch = () => {
    if (!contractNumber) {
      alert("Por favor, insira um número de contrato");
      return;
    }

    // Busca o contrato pelo número
    const contrato = getContractByNumber(contractNumber);

    if (contrato) {
      setChaveEncontrada({
        contrato: contrato.numero,
        chave: contrato.chave,
      });
      setMensagemErro(null);
    } else {
      setChaveEncontrada(null);
      setMensagemErro(
        "Contrato não encontrado. Verifique o número e tente novamente."
      );
    }
  };

  const handleCopyKey = () => {
    if (chaveEncontrada) {
      navigator.clipboard.writeText(chaveEncontrada.chave);
      alert("Chave copiada com sucesso!");
    }
  };

  const handleResetKey = async () => {
    if (!contractNumber) {
      alert("Por favor, insira um número de contrato");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:3006/api/prestadores/reset-access-key",
        {
          numero_contrato: contractNumber,
        }
      );
      // Exibe a nova chave para o usuário
      setChaveEncontrada({
        contrato: contractNumber,
        chave: response.data.new_chave_acesso,
      });
      setMensagemErro(null);
    } catch (err: any) {
      setChaveEncontrada(null);
      setMensagemErro(
        err.response?.data?.message ||
          "Erro ao redefinir a chave. Tente novamente."
      );
    }
  };

  return (
    <div className="config-section">
      <h2 className="section-title">Resete de senha</h2>
      <div className="input-container">
        <label className="result-label">
          Informe o número do contrato vinculado à chave
        </label>
        <input
          type="text"
          value={contractNumber}
          onChange={(e) => setContractNumber(e.target.value)}
          className="input-field"
          placeholder="Digite o número do contrato"
        />
      </div>
      <button
        className="action-button"
        onClick={handleResetKey}
        style={{ maxWidth: "200px" }}
      >
        Gerar
      </button>
      {chaveEncontrada && (
        <div className="result-container">
          <span className="result-label">Nova senha</span>
          <span className="result-value">{chaveEncontrada.chave}</span>
          <button className="copy-button" onClick={handleCopyKey}>
            Copiar
          </button>
        </div>
      )}
      {mensagemErro && (
        <div
          className="error-message"
          style={{ marginTop: "20px", color: "red" }}
        >
          {mensagemErro}
        </div>
      )}
    </div>
  );
};

export default HistoricoChavePage;
