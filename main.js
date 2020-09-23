import express from "express";
import http from "http";
import socketIo from "socket.io";

import path, { dirname } from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const port = process.env.PORT || 4000;
const PRODUCTION = false;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

import { router } from"./routes/routes.js";
import { sockets } from "./routes/sockets.js";

app.use(express.static(path.join(__dirname, "client/build")));

app.use(router());
app.use(sockets(io));

if(PRODUCTION) {
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname + "/client/build/index.html"));
    })
}

server.listen(port, () => {
    console.log(`Server started on port ${port}!`);
});