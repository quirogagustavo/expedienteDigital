
import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResponse(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const res = await fetch('http://localhost:4000/sign', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Error al subir el archivo');
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Firma Digital de Documentos</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit" disabled={!file || loading}>
          {loading ? 'Enviando...' : 'Firmar Documento'}
        </button>
      </form>
      {response && (
        <div className="response">
          <h2>Respuesta del servidor:</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default App;
