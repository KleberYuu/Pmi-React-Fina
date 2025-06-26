import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import NovaChavePage from "./NovaChavePage";
import HistoricoChavePage from "./HistoricoChavePage";
import RelatorioPage from "./RelatorioPage";
import "../styles/DashboardPage.css";

const DashboardPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate("/login");
  };

  return (
    <div
      className="gradient-background"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        alignContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div
          className="logo-container"
          onClick={handleLogoClick}
          style={{ cursor: "pointer" }}
        >
          <span className="logo-text">Calcule</span>
          <span className="logo-text logo-text-facil">Fácil</span>
        </div>
        <button
          className="action-button"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("usuarioId");
            // Se salvou o objeto inteiro, pode remover também:
            // localStorage.removeItem("usuario");
            navigate("/login");
          }}
          style={{ maxWidth: "100px" }}
        >
          Sair
        </button>
      </div>

      <div className="tab-container" style={{ width: "80%" }}>
        <div className="tab-header">
          <button
            className={`tab-button ${currentTab === 0 ? "active" : ""}`}
            onClick={() => setCurrentTab(0)}
          >
            Nova Chave
          </button>
          <button
            className={`tab-button ${currentTab === 1 ? "active" : ""}`}
            onClick={() => setCurrentTab(1)}
          >
            Resete de senha
          </button>
          <button
            className={`tab-button ${currentTab === 2 ? "active" : ""}`}
            onClick={() => setCurrentTab(2)}
          >
            Relatório
          </button>
        </div>

        <div className="content-box">
          {currentTab === 0 && <NovaChavePage />}
          {currentTab === 1 && <HistoricoChavePage />}
          {currentTab === 2 && <RelatorioPage />}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
