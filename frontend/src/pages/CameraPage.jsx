import React, { useState, useRef } from 'react';
import { Camera as CameraIcon, Upload, Loader2, Info } from 'lucide-react';

export default function CameraPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:3000/api/vision', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Vision analysis error:', error);
      setResult({ status: 'error', message: 'Resim analiz edilirken bir hata oluştu.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-primary-dark p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Ne Görüyorsun?</h2>
      
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {previewUrl ? (
          <div className="w-full relative rounded-2xl overflow-hidden shadow-2xl mb-6 bg-gray-800 flex items-center justify-center" style={{ minHeight: '300px' }}>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[500px] object-contain" />
            <button 
              onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); }}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
            >
              ✕
            </button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-64 border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-gold hover:bg-gray-800 transition mb-6"
          >
            <CameraIcon size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-300 font-medium text-center px-4">
              Fotoğraf çekin veya <br/> galeriden bir resim seçin
            </p>
          </div>
        )}

        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          capture="environment" // Optional: suggests mobile devices to open camera directly
        />

        {!previewUrl && (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700 transition"
          >
            <Upload size={20} /> Resim Seç
          </button>
        )}

        {previewUrl && !result && !isAnalyzing && (
          <button 
            onClick={handleAnalyze}
            className="w-full bg-primary-gold text-primary-dark font-bold py-4 rounded-xl shadow-lg hover:bg-opacity-90 transition"
          >
            Bu Eseri Tanı
          </button>
        )}

        {isAnalyzing && (
          <div className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} /> Analiz Ediliyor...
          </div>
        )}

        {result && (
          <div className={`w-full mt-4 p-4 rounded-xl flex items-start gap-3 ${result.status === 'error' ? 'bg-red-900 border border-red-700' : 'bg-gray-800 border border-primary-gold'}`}>
            <Info className={result.status === 'error' ? 'text-red-400' : 'text-primary-gold'} size={24} />
            <div>
              <h3 className="font-bold text-white mb-1">
                {result.status === 'error' ? 'Hata' : 'Analiz Sonucu'}
              </h3>
              <p className="text-sm text-gray-300">{result.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
