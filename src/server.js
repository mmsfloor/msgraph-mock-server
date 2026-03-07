const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const dataService = require('./services/dataService');
const graphRoutes = require('./routes/graphRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data/sample_export.json');

// 1. Mock Bearer token validation
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // For a mock server, we can be lenient or strict. 
        // Let's log it but allow it for development unless specified.
        console.warn('Warning: Missing or invalid Authorization header');
    }
    next();
});

// 2. Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// 3. Register routes under /v1.0 to mimic Graph
app.use('/v1.0', graphRoutes);

// 4. Error handling for non-existent routes within /v1.0
app.use('/v1.0', (req, res) => {
    res.status(404).json({
        error: {
            code: "Request_ResourceNotFound",
            message: "Resource not found"
        }
    });
});

// 5. Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: {
            code: "InternalServerError",
            message: "An internal server error occurred"
        }
    });
});

// 6. Default route
app.get('/', (req, res) => {
    res.json({
        message: "Microsoft Graph Mock Server",
        version: "v1.0",
        status: "Running"
    });
});

// 5. Initialize and Start Server
async function startServer() {
    console.log('Initializing data service...');
    await dataService.loadData(DATA_FILE);
    
    app.listen(PORT, () => {
        console.log(`Mock server running at http://localhost:${PORT}`);
        console.log(`Graph endpoints available at http://localhost:${PORT}/v1.0/`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
});
