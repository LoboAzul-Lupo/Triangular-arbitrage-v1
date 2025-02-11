require('dotenv').config();

module.exports = {
    // Configuración general
    testMode: process.env.NODE_ENV !== 'production',
    updateInterval: 1000,  // 1 segundo
    scanInterval: 2000,    // 2 segundos
    minProfitPercent: 0.5, // 0.5%

    // Configuración de exchanges
    exchanges: {
        binance: {
            apiKey: process.env.BINANCE_API_KEY,
            apiSecret: process.env.BINANCE_API_SECRET,
            baseUrl: 'https://api.binance.com/api/v3'
        },
        huobi: {
            apiKey: process.env.HUOBI_API_KEY,
            apiSecret: process.env.HUOBI_API_SECRET,
            baseUrl: 'https://api.huobi.pro'
        }
    },

    // Tokens base para trading
    baseTokens: [
        'USDT',
        'BTC',
        'ETH'
    ],

    // Pares de trading a monitorear
    tradingPairs: [
        'BTC-USDT',
        'ETH-USDT',
        'ETH-BTC',
    ],

    // Configuración de logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        filepath: './logs/arbitrage.log'
    }
};