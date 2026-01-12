
import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Table, 
  Upload, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  ArrowRight,
  FileCode,
  Image as ImageIcon
} from 'lucide-react';
import { ConversionTarget, ConversionStatus, DocumentPage, TableData } from './types';
import { extractPagesAsImages, generateExcel, generateWord, fileToDataUrl } from './services/fileService';
import { processPageWithGemini } from './services/geminiService';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [status, setStatus] = useState<ConversionStatus>({
    step: 'Idle',
    progress: 0,
    isProcessing: false
  });
  const [target, setTarget] = useState<ConversionTarget>(ConversionTarget.WORD);
  const [conversionResult, setConversionResult] = useState<{
    tables?: TableData[];
    markdown?: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isPdf = selectedFile.type === 'application/pdf';
      const isImage = selectedFile.type.startsWith('image/');

      if (isPdf || isImage) {
        setFile(selectedFile);
        setPages([]);
        setConversionResult(null);
        setStatus({ step: 'Ready to convert', progress: 0, isProcessing: false });
        
        try {
          if (isPdf) {
            const extractedPages = await extractPagesAsImages(selectedFile);
            setPages(extractedPages);
          } else {
            const dataUrl = await fileToDataUrl(selectedFile);
            setPages([{ index: 1, dataUrl }]);
          }
        } catch (err) {
          setStatus(prev => ({ ...prev, error: 'Failed to process file' }));
        }
      } else {
        alert('Please upload a valid PDF or Image file (PNG, JPG).');
      }
    }
  };

  const triggerDownload = async (targetType: ConversionTarget, data: any, fileName: string) => {
    const cleanFileName = fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
    if (targetType === ConversionTarget.EXCEL) {
      generateExcel(data.tables || [], cleanFileName);
    } else {
      await generateWord(data.markdown || '', cleanFileName);
    }
  };

  const startConversion = async () => {
    if (!file || pages.length === 0) return;

    setStatus({
      step: `Initializing Gemini for ${target}...`,
      progress: 5,
      isProcessing: true
    });

    try {
      const pageResults: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const pageStatusText = `Processing page ${i + 1} of ${pages.length}...`;
        setStatus(prev => ({ 
          ...prev, 
          step: pageStatusText, 
          progress: 5 + Math.floor((i / pages.length) * 85) 
        }));
        
        const result = await processPageWithGemini(pages[i].dataUrl, target);
        pageResults.push(result);
      }

      setStatus({ step: 'Finalizing document...', progress: 95, isProcessing: true });

      let finalData: any = {};
      
      if (target === ConversionTarget.EXCEL) {
        const allTables = pageResults.flatMap(res => {
          try {
            return JSON.parse(res).tables || [];
          } catch {
            return [];
          }
        });
        finalData = { tables: allTables };
      } else {
        const fullMarkdown = pageResults.join('\n\n--- PAGE BREAK ---\n\n');
        finalData = { markdown: fullMarkdown };
      }

      setConversionResult(finalData);
      await triggerDownload(target, finalData, file.name);

      setStatus({
        step: 'Conversion Complete!',
        progress: 100,
        isProcessing: false
      });
    } catch (err: any) {
      console.error(err);
      setStatus({
        step: 'Error occurred',
        progress: 0,
        isProcessing: false,
        error: err.message || 'Something went wrong during conversion.'
      });
    }
  };

  const handleManualDownload = () => {
    if (file && conversionResult) {
      triggerDownload(target, conversionResult, file.name);
    }
  };

  const reset = () => {
    setFile(null);
    setPages([]);
    setConversionResult(null);
    setStatus({ step: 'Idle', progress: 0, isProcessing: false });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <FileText size={24} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Gemini PDF Pro
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500">
            <span className="hover:text-indigo-600 cursor-pointer font-semibold">Fast</span>
            <span className="hover:text-indigo-600 cursor-pointer font-semibold">Accurate</span>
            <span className="hover:text-indigo-600 cursor-pointer font-semibold">AI-Powered</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Convert Documents with AI precision
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Our AI engine uses Gemini 3 Flash to understand your PDFs and images, extracting tables into Excel or layouts into Word with unmatched accuracy.
          </p>
        </div>

        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group shadow-sm"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".pdf,image/png,image/jpeg" 
              className="hidden" 
            />
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Upload className="text-indigo-600" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-slate-800">Click to upload PDF or Image</h3>
            <p className="text-slate-500">Supports PDF, PNG, JPG (Max 25MB). Perfect for scanned documents.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`${file.type === 'application/pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} p-3 rounded-lg`}>
                  {file.type === 'application/pdf' ? <FileText size={32} /> : <ImageIcon size={32} />}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-slate-800 truncate max-w-[250px] sm:max-w-md">{file.name}</h4>
                  <p className="text-slate-500 text-sm font-medium">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                  </p>
                </div>
              </div>
              {!status.isProcessing && (
                <button 
                  onClick={reset}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition"
                  title="Remove file"
                >
                  <X size={24} />
                </button>
              )}
            </div>

            {!status.isProcessing && status.progress === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setTarget(ConversionTarget.WORD)}
                  className={`p-6 rounded-xl border-2 transition-all text-left flex items-start gap-4 ${
                    target === ConversionTarget.WORD 
                    ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-100' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${target === ConversionTarget.WORD ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <FileCode size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Convert to Word</h5>
                    <p className="text-sm text-slate-500 mt-1">Preserves layout, text styles, and structure for easy editing.</p>
                  </div>
                </button>
                <button
                  onClick={() => setTarget(ConversionTarget.EXCEL)}
                  className={`p-6 rounded-xl border-2 transition-all text-left flex items-start gap-4 ${
                    target === ConversionTarget.EXCEL 
                    ? 'border-emerald-600 bg-emerald-50/50 ring-4 ring-emerald-100' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${target === ConversionTarget.EXCEL ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Table size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">Convert to Excel</h5>
                    <p className="text-sm text-slate-500 mt-1">Automatically extracts tables and data into structured sheets.</p>
                  </div>
                </button>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-md">
              {status.isProcessing ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-indigo-600 font-bold flex items-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      {status.step}
                    </span>
                    <span className="text-slate-900 font-extrabold">{status.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                      style={{ width: `${status.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-slate-500 text-sm italic font-medium">
                    Gemini is analyzing your content. This usually takes 10-20 seconds...
                  </p>
                </div>
              ) : status.progress === 100 ? (
                <div className="text-center space-y-4 py-4 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50 shadow-inner">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900">Success! File Ready.</h3>
                  <p className="text-slate-600 font-medium max-w-sm mx-auto">
                    Your converted file has been downloaded automatically.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center mt-8">
                    <button 
                      onClick={handleManualDownload}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-200/50"
                    >
                      <Download size={22} />
                      Download Again
                    </button>
                    <button 
                      onClick={reset}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-200 transition"
                    >
                      Convert Another
                    </button>
                  </div>
                </div>
              ) : status.error ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Something went wrong</h3>
                  <p className="text-red-500 font-medium px-6">{status.error}</p>
                  <button 
                    onClick={reset}
                    className="mt-4 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition shadow-lg"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <button 
                    onClick={startConversion}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-xl hover:shadow-indigo-500/20 active:scale-95"
                  >
                    Convert to {target === ConversionTarget.WORD ? 'Word' : 'Excel'}
                    <ArrowRight size={22} />
                  </button>
                  <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-slate-500 text-sm font-semibold">
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> AI OCR</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> Scanned Image Support</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-500" /> High Precision</span>
                  </div>
                </div>
              )}
            </div>

            {pages.length > 0 && !status.isProcessing && status.progress !== 100 && (
              <div className="mt-12">
                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
                  <FileText size={20} className="text-indigo-600" />
                  File Preview
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {pages.map((page) => (
                    <div key={page.index} className="relative group">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white transition-transform group-hover:scale-[1.02]">
                        <img src={page.dataUrl} alt={`Page ${page.index}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                      </div>
                      <span className="absolute bottom-3 left-3 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md">
                        {file.type === 'application/pdf' ? `P${page.index}` : 'Image'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileSpreadsheet size={24} />
            </div>
            <h5 className="font-extrabold text-lg text-slate-900">Smart Table Extraction</h5>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Gemini identifies complex table structures, merged cells, and headers, converting them to clean, usable Excel data.
            </p>
          </div>
          <div className="space-y-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
              <ImageIcon size={24} />
            </div>
            <h5 className="font-extrabold text-lg text-slate-900">OCR for Scans & Photos</h5>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Easily convert camera photos of documents or screenshots into editable formats with high-fidelity text recognition.
            </p>
          </div>
          <div className="space-y-4 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h5 className="font-extrabold text-lg text-slate-900">Contextual Reasoning</h5>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Gemini 3 Pro doesn't just read text; it understands the logical flow, ensuring multi-column layouts stay intact.
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-16 mt-32">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-slate-900 p-1.5 rounded text-white">
              <FileText size={18} />
            </div>
            <span className="text-lg font-black text-slate-900">Gemini PDF Pro</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">© 2024 AI Document Solutions. Powered by Google Gemini.</p>
          <div className="mt-8 flex justify-center gap-8 text-sm font-bold text-slate-400">
            <a href="#" className="hover:text-indigo-600 transition">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition">Terms</a>
            <a href="#" className="hover:text-indigo-600 transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
