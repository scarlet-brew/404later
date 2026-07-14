import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies (needed for upcoming POST/PUT endpoints)
app.use(express.json());

// Serve static frontend files from the public/ directory
app.use(express.static('public'));

// Health check — confirms the server is running
app.get('/api/health', (request, response) => {
  response.status(200).json({
    success: true,
    data: { status: 'ok' },
    error: null,
  });
});

app.listen(PORT, () => {
  console.log(`404later server listening on http://localhost:${PORT}`);
});
