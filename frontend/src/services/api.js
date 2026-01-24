import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

export const getStocks = () => api.get('/stocks/');
export const addStock = (symbol) => api.post('/stocks/', { symbol });
export const deleteStock = (symbol) => api.delete(`/stocks/${symbol}`);
export const getAnalysis = (symbol, period = '1y', interval = '1d') =>
    api.get(`/stocks/${symbol}/analysis`, { params: { period, interval } });

export default api;
