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

export const getTemplates = () => api.get('/templates/');
export const addTemplate = (template) => api.post('/templates/', template);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);


export const scanStocks = () => api.post('/stocks/scan');
export const scanStocksEFI = () => api.post('/stocks/scan/efi');

export default api;
