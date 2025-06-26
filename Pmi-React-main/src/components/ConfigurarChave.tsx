import React, { useState } from 'react';
import '../styles/DashboardPage.css';

interface ConfigurarChaveProps {
  numeroContrato: string;
  onVoltar: () => void;
}

const ConfigurarChave: React.FC<ConfigurarChaveProps> = ({ numeroContrato, onVoltar }) => {
  const [lotes, setLotes] = useState([
    { numero: '', quantidade: '' },
  ]);

  const handleAddLote = () => {
    setLotes([...lotes, { numero: '', quantidade: '' }]);
  };

  const handleLoteChange = (index: number, field: 'numero' | 'quantidade', value: string) => {
    const newLotes = [...lotes];
    newLotes[index][field] = value;
    setLotes(newLotes);
  };

  const handleUploadCCT = (index: number) => {
    // Implementar lógica de upload
    console.log(`Upload CCT para lote ${index}`);
  };

  const handleGerarChave = () => {
    // Implementar lógica de geração de chave
    console.log('Gerando chave para os lotes:', lotes);
  };

  return (
    <>
      <button 
        className="voltar-button"
        onClick={onVoltar}
      >
        Voltar
      </button>

      <div className="config-section">
        <h2 className="section-title">Configurar chave de acesso</h2>
        
        {lotes.map((lote, index) => (
          <div key={index} className="input-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label>Informar lote</label>
                <input
                  type="text"
                  value={lote.numero}
                  onChange={(e) => handleLoteChange(index, 'numero', e.target.value)}
                  className="input-field"
                  placeholder="Número do lote"
                />
              </div>
              <div style={{ flex: 2 }}>
                <label>Quantidade de documentos a serem preenchidos</label>
                <input
                  type="text"
                  value={lote.quantidade}
                  onChange={(e) => handleLoteChange(index, 'quantidade', e.target.value)}
                  className="input-field"
                  placeholder="Quantidade"
                />
              </div>
              <button
                className="upload-button"
                onClick={() => handleUploadCCT(index)}
                style={{ alignSelf: 'flex-end' }}
              >
                Upload CCT
              </button>
            </div>
          </div>
        ))}

        <button className="action-button" onClick={handleAddLote} style={{ marginBottom: '20px' }}>
          Adicionar Lote
        </button>

        <button className="action-button" onClick={handleGerarChave}>
          Gerar chave de acesso
        </button>

        <div className="input-container" style={{ marginTop: '20px' }}>
          <label className="result-label">
            Número do contrato
          </label>
          <input
            type="text"
            value={numeroContrato}
            readOnly
            className="input-field"
          />
        </div>
      </div>
    </>
  );
};

export default ConfigurarChave; 