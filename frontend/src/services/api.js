import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const getStocks = () => api.get('/stocks/');
export const addStock = (symbol) => api.post('/stocks/', { symbol });
export const deleteStock = (symbol) => api.delete(`/stocks/${symbol}`);
export const getAnalysis = (symbol, period = '1y', interval = '1d') =>
    api.get(`/stocks/${symbol}/analysis`, { params: { period, interval } });

// Journal
export const saveJournalEntry = (entry) => api.post('/journal/', entry);
export const getJournalEntries = (symbol, timeframe) => api.get(`/journal/${symbol}?timeframe=${timeframe}`);
export const deleteJournalEntry = (id) => api.delete(`/journal/${id}`);

export const getTemplates = () => api.get('/templates/');
export const addTemplate = (template) => api.post('/templates/', template);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);

export default api;
