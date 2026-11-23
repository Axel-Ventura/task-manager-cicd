import app from './app.js';

const port = process.env.PORT || 3000;
const host = '0.0.0.0';
app.listen(port, host, () => console.log(`Task Manager API escuchando en http://${host}:${port}`));
