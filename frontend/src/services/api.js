import axios from 'axios';

const api = axios.create({
    baseURL: `http://${window.location.hostname}:8000`,
});

export const getStocks = () => api.get('/stocks/');
export const addStock = (symbol) => api.post('/stocks/', { symbol });
export const deleteStock = (symbol) => api.delete(`/stocks/${symbol}`);
export const toggleWatchStock = (symbol) => api.put(`/stocks/${symbol}/watch`);
export const getAnalysis = (symbol, period = '1y', interval = '1d') =>
    api.get(`/stocks/${symbol}/analysis`, { params: { period, interval } });

// Journal
export const saveJournalEntry = (entry) => api.post('/journal/', entry);
export const getJournalEntries = (symbol, timeframe) => api.get(`/journal/${symbol}`, { params: { timeframe } });
export const updateJournalEntry = (id, note) => api.put(`/journal/${id}`, { note });
export const deleteJournalEntry = (id) => api.delete(`/journal/${id}`);

// --- Trade Journal ---
export const getTrades = () => api.get('/trades/');
export const logTrade = (entry) => api.post('/trades/', entry);
export const updateTrade = (id, data) => api.patch(`/trades/${id}`, data);
export const deleteTrade = (id) => api.delete(`/trades/${id}`);
export const getActiveTrade = (symbol) => api.get(`/trades/active/${symbol}`);

export const getTemplates = () => api.get('/templates/');
export const addTemplate = (template) => api.post('/templates/', template);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);


export const scanStocks = () => api.post('/stocks/scan');
export const scanStocksEFI = () => api.post('/stocks/scan/efi');

// Backtest API
export const runBacktest = (config) => api.post('/backtest/run', config);
export const getBacktestResults = (skip = 0, limit = 50, symbol = null, strategy = null) =>
    api.get('/backtest/', { params: { skip, limit, symbol, strategy } });
export const getBacktestResult = (resultId) => api.get(`/backtest/${resultId}`);
export const deleteBacktestResult = (resultId) => api.delete(`/backtest/${resultId}`);
export const getBacktestTrades = (resultId) => api.get(`/backtest/${resultId}/trades`);
export const getBacktestEquity = (resultId) => api.get(`/backtest/${resultId}/equity`);
export const compareBacktests = (resultIds) => api.get(`/backtest/compare?result_ids=${resultIds}`);
export const getBacktestSummary = (symbol) => api.get(`/backtest/summary/${symbol}`);
export const runBatchBacktest = (config) => api.post('/backtest/batch', config);
export const getStrategyScript = (strategyType) => api.get(`/backtest/scripts/${strategyType}`);
export const getCustomScripts = () => api.get('/backtest/custom_scripts');
export const getCustomScript = (id) => api.get(`/backtest/custom_scripts/${id}`);
export const saveCustomScript = (script) => api.post('/backtest/custom_scripts', script);
export const updateCustomScript = (id, script) => api.put(`/backtest/custom_scripts/${id}`, script);
export const deleteCustomScript = (id) => api.delete(`/backtest/custom_scripts/${id}`);

export default api;
