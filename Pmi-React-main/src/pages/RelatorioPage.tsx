import axios from "axios";
import React, { useEffect, useState } from "react";
import "../styles/DashboardPage.css";
import "../styles/RelatorioPage.css";

interface ContratoInfo {
  id: string;
  numero: string;
  status: string;
}

const RelatorioPage: React.FC = () => {
  const [contratos, setContratos] = useState<ContratoInfo[]>([]);

  useEffect(() => {
    // Busca os processos na API
    axios
      .get("http://localhost:3006/api/processos")
      .then((res) => {
        // Mapeia os dados para o formato da tabela
        const contratosFormatados = res.data.map((processo: any) => ({
          id: processo.id,
          numero: processo.numero_contrato,
          status: traduzirStatus(processo.status),
        }));
        setContratos(contratosFormatados);
      })
      .catch(() => {
        setContratos([]);
      });
  }, []);

  // Função para traduzir o status do backend para o texto desejado
  function traduzirStatus(status: string) {
    if (status === "pendente_formalizacao") return "Em Trânsito";
    if (status === "enviado_homologacao") return "Esperando Homologação";
    if (status === "homologado") return "Homologado";
    // Adicione outros status conforme necessário
    return status;
  }

  const handleGerarRelatorio = async (processoId: string) => {
    try {
      const response = await axios.post(
        `http://localhost:3006/api/processos/${processoId}/formalizar`
      );
      alert(response.data.message || "Processo formalizado com sucesso!");
      window.location.reload();
    } catch (err: any) {
      alert(
        err.response?.data?.message ||
          "Erro ao formalizar o processo. Tente novamente."
      );
    }
  };

  return (
    <div className="config-section">
      <h2 className="section-title">Relatório de Contratos</h2>

      {contratos.length > 0 ? (
        <div className="relatorio-table">
          <div className="relatorio-header">
            <div className="relatorio-cell">Número do contrato</div>
            <div className="relatorio-cell">Status</div>
            <div className="relatorio-cell">Ação</div>
          </div>

          {contratos.map((contrato) => (
            <div className="relatorio-row" key={contrato.numero}>
              <div className="relatorio-cell">{contrato.numero}</div>
              <div className="relatorio-cell">{contrato.status}</div>
              <div className="relatorio-cell">
                <button
                  className={`relatorio-button ${
                    contrato.status === "Homologado" ? "enabled" : "disabled"
                  }`}
                  onClick={() =>
                    contrato.status === "Homologado" &&
                    handleGerarRelatorio(contrato.id)
                  }
                  disabled={contrato.status !== "Homologado"}
                >
                  Clique aqui para gerar o relatório
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="section-title">
          Nenhum contrato encontrado. Gere uma chave na tela "Nova Chave"
          primeiro.
        </div>
      )}
    </div>
  );
};

export default RelatorioPage;
