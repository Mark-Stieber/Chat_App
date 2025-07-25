const express = require('express');
const session = require('express-session');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);

// Using JSON
app.use(express.json());


// Session
const sessionMiddleware = session({
        secret: 'secret-key',
        saveUninitialized: false,
        resave: false,
        cookie: { secure: false },
});

// Keep track of usernames to avoid dups.
const usernameMap = new Map()

io.engine.use(sessionMiddleware);

app.use(sessionMiddleware);

app.get('/', (req,res) => {
    res.sendFile(__dirname+'/startup.html');
});

app.post('/username', (req,res) => {
    const username = req.body.username;
    if(usernameMap.get(username) == undefined){
        usernameMap.set(username,0);
        req.session.username = username;
        res.send({message: "free"})
    }
    else {
        res.send({message: "username taken"});
    }
})

app.get('/getUser', (req,res) => {
    res.send({username: req.session.username});
})

app.get('/index', (req,res) => {
    res.sendFile(__dirname+'/index.html');
})

io.on('connection', (socket) => {
    // disconnect users with no username
    var username = socket.request.session.username;
    if(username == undefined){
        socket.disconnect();
    }

    socket.on('userdata', (msg) => {
        console.log('user '+username+' connected ');
    })

    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        socket.broadcast.except(socket.rooms).emit('return message', msg);
    })

    //socket.broadcast.in().emit
    socket.on('disconnect', () => {
        console.log('user '+username+' disconnected');
        usernameMap.delete(username);
        socket.request.session.destroy((err) => {
            if(err){
                console.log("disconnect ERROR");
            }
        });
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});