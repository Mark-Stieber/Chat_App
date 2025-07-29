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

// Init using session
io.engine.use(sessionMiddleware);
app.use(sessionMiddleware);

app.get('/', (req,res) => {
    res.sendFile(__dirname+'/startup.html');
});

app.post('/username', (req,res) => {
    const username = req.body.username;
    
    // making sure duplicate names are not allowed
    if(usernameMap.get(username) == undefined){
        usernameMap.set(username,0);
        req.session.username = username;
        res.send({message: "free"})
    }
    else {
        res.send({message: "username taken"});
    }
})

// Sends Index current user
app.get('/getcurrentUser', (req,res) => {
    res.send({username: req.session.username});
})

// Sends index array of all usernames
app.get('/getUsers', (req,res) => {
    let usernameAry = [];
    for(let key of usernameMap.keys()){
        usernameAry.push(key);
    }
    res.send({usernames: usernameAry});
})

app.get('/index', (req,res) => {
    res.sendFile(__dirname+'/index.html');
})

io.on('connection', (socket) => {
    // disconnect users with no username
    var username = socket.request.session.username;
    console.log(usernameMap);
    if(username == undefined){
        socket.disconnect();
    }

    // Shows a user connected in terminal
    socket.on('userdata', (msg) => {
        console.log('user '+username+' connected ');
        socket.broadcast.emit('usersChanged');
    })

    // Sends message to all users except the user who sent the message.
    socket.on('chat message', (msg) => {
        console.log('message: ' + msg);
        socket.broadcast.except(socket.rooms).emit('return message', msg);
    })

    // When a user disconnects
    socket.on('disconnect', () => {
        console.log('user '+username+' disconnected');
        usernameMap.delete(username);

        // Tell everyone to change usernames list.
        socket.broadcast.emit('usersChanged');

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