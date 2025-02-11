const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const priceService = require('../services/priceService');

class TriangularArbitrage extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.isRunning = false;
        this.lastPrices = {};
        
        logger.info('TriangularArbitrage instanciado con config:', config);
    }

    async initialize() {
        try {
            logger.info('Inicializando sistema de monitoreo de precios...');
            
            // Verificar conexión con los exchanges
            await this.testExchangeConnections();
            
            return true;
        } catch (error) {
            logger.error('Error en inicialización:', error);
            return false;
        }
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        logger.info('Iniciando monitoreo de precios...');
        
        while (this.isRunning) {
            try {
                await this.updatePrices();
                await new Promise(resolve => setTimeout(resolve, this.config.updateInterval));
            } catch (error) {
                logger.error('Error en ciclo de monitoreo:', error);
                await new Promise(resolve => setTimeout(resolve, this.config.updateInterval * 2));
            }
        }
    }

    async updatePrices() {
        try {
            const prices = await priceService.getPrices(this.config.tradingPairs);
            
            // Detectar cambios significativos en los precios
            const priceChanges = this.analyzePriceChanges(prices);
            
            if (priceChanges.length > 0) {
                logger.info('Cambios significativos detectados:', priceChanges);
            }
            
            this.lastPrices = prices;
            this.emit('pricesUpdated', prices);
            
            // Log de debug con los precios actuales
            logger.debug('Precios actualizados:', {
                timestamp: new Date().toISOString(),
                prices: prices
            });
            
            return prices;
        } catch (error) {
            logger.error('Error actualizando precios:', error);
            throw error;
        }
    }

    analyzePriceChanges(newPrices) {
        const changes = [];
        
        for (const exchange in newPrices) {
            if (!this.lastPrices[exchange]) continue;
            
            for (const pair in newPrices[exchange]) {
                const oldPrice = this.lastPrices[exchange][pair];
                const newPrice = newPrices[exchange][pair];
                
                if (!oldPrice) continue;
                
                const priceChange = ((newPrice - oldPrice) / oldPrice) * 100;
                
                if (Math.abs(priceChange) >= 0.5) { // 0.5% de cambio
                    changes.push({
                        exchange,
                        pair,
                        oldPrice,
                        newPrice,
                        changePercent: priceChange
                    });
                }
            }
        }
        
        return changes;
    }

    async testExchangeConnections() {
        try {
            // Probar conexión obteniendo precios de un par
            const testPair = this.config.tradingPairs[0];
            const prices = await priceService.getPrices([testPair]);
            
            logger.info('Conexión con exchanges exitosa:', {
                testPair,
                prices
            });
            
            return true;
        } catch (error) {
            logger.error('Error probando conexión con exchanges:', error);
            throw error;
        }
    }

    stop() {
        this.isRunning = false;
        logger.info('Sistema de monitoreo detenido');
    }
}

module.exports = TriangularArbitrage;