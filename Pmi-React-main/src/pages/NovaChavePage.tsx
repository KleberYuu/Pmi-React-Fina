import React, { useState } from "react";
import "../styles/DashboardPage.css";
import { generateRandomKey } from "../utils/keyGenerator";
import axios from "axios";

const NovaChavePage: React.FC = () => {
  // Estado para os pares de lote e quantidade
  const [lotes, setLotes] = useState([{ lote: "", quantidade: "" }]);
  const [contractNumber, setContractNumber] = useState("");
  const [tipoProcesso, settipoProcesso] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const usuarioId = localStorage.getItem("usuarioId");

  // Função para atualizar valores dos campos
  const handleLoteChange = (
    index: number,
    field: "lote" | "quantidade",
    value: string
  ) => {
    const novosLotes = [...lotes];
    novosLotes[index][field] = value;
    setLotes(novosLotes);
  };

  // Adicionar novo par
  const handleAddLote = () => {
    setLotes([...lotes, { lote: "", quantidade: "" }]);
  };

  // Remover par
  const handleRemoveLote = (index: number) => {
    if (lotes.length === 1) return; // Garante pelo menos um par
    const novosLotes = lotes.filter((_, i) => i !== index);
    setLotes(novosLotes);
  };

  const handleGenerateKey = async () => {
    if (!contractNumber || !tipoProcesso || !usuarioId) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    // Monta os lotes no formato esperado pela API
    const lotesPayload = lotes.map((l) => ({
      numero_lote: Number(l.lote),
      quantidade_profissionais: Number(l.quantidade),
    }));

    // Gera a chave de acesso (pode ser random ou conforme sua regra)
    const chaveAcesso = generateRandomKey();

    const processData = {
      numero_contrato: contractNumber,
      chave_acesso: chaveAcesso,
      tipo_processo: tipoProcesso,
      lotes: lotesPayload,
    };

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:3006/api/processos/full-creation",
        processData,
        {
          headers: {
            // Se precisar autenticação, adicione o token:
            // Authorization: `Bearer ${localStorage.getItem('token')}`
          },
        }
      );
      // Só mostra a chave se a API retornar sucesso
      setAccessKey(chaveAcesso);
      alert("Processo criado com sucesso!");
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Erro ao criar processo. Tente novamente."
      );
      setAccessKey(""); // Garante que não mostra a chave em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (accessKey) {
      navigator.clipboard.writeText(accessKey);
      alert("Chave copiada com sucesso!");
    }
  };

  return (
    <div
      className="config-section"
      style={{
        display: "flex",
        alignItems: "baseline",
        flexDirection: "column",
        gap: 8,
        marginBottom: 8,
      }}
    >
      <h2 className="section-title">Criar Processo</h2>
      {/* Campos dinâmicos de lote e quantidade */}
      {lotes.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <label className="result-label" style={{ padding: "10px 16px" }}>
            Informe Lote
          </label>
          <input
            type="text"
            placeholder="Informar lote"
            value={item.lote}
            className="input-field"
            onChange={(e) => handleLoteChange(idx, "lote", e.target.value)}
            style={{
              width: 120,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <label className="result-label" style={{ padding: "10px 16px" }}>
            Informe Quantidade de documentos
          </label>
          <input
            type="number"
            placeholder="Quantidade de documentos"
            value={item.quantidade}
            className="input-field"
            onChange={(e) =>
              handleLoteChange(idx, "quantidade", e.target.value)
            }
            style={{
              width: 180,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <button
            type="button"
            onClick={handleAddLote}
            style={{ padding: "4px 10px", fontSize: 18, marginLeft: 4 }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleRemoveLote(idx)}
            style={{ padding: "4px 10px", fontSize: 18, marginLeft: 2 }}
            disabled={lotes.length === 1}
          >
            -
          </button>
        </div>
      ))}
      {/* Fim dos campos dinâmicos */}
      <div className="input-container">
        <div className="input-container">
          <label className="result-label" style={{ padding: "10px 16px" }}>
            Informe tipo de processo
          </label>
          <input
            type="text"
            value={tipoProcesso}
            onChange={(e) => settipoProcesso(e.target.value)}
            className="input-field"
            placeholder="EX: Concorrência"
          />
        </div>

        <div className="input-container">
          <label className="result-label" style={{ padding: "10px 16px" }}>
            Informe o número do contrato
          </label>
          <input
            type="text"
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            className="input-field"
            placeholder="XXXX/XXXX/XXX"
          />
        </div>
      </div>
      <button
        className="action-button"
        onClick={handleGenerateKey}
        style={{ alignSelf: "center", maxWidth: "200px", marginBottom: "20px" }}
      >
        Gerar chave
      </button>

      {accessKey && (
        <div className="result-container" style={{ alignSelf: "center" }}>
          <span className="result-label">Chave de acesso</span>
          <span className="result-value">{accessKey}</span>
          <button className="copy-button" onClick={handleCopyKey}>
            Copiar
          </button>
        </div>
      )}
    </div>
  );
};

export default NovaChavePage;
