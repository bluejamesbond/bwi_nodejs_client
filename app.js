// server.js (Express 4.0)
var express = require('express');
var morgan = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var app = express();
var fork = require('child_process').fork;

app.use(express.static(__dirname + '/public')); // set the static files location /public/img will be /img for users
app.use(morgan('dev')); // log every request to the console
app.use(bodyParser.urlencoded({
        extended: false
    })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json
app.use(methodOverride()); // simulate DELETE and PUT

var inactive = true;
var ros, server, io;
var send = function(type, data){
    ros.send({
        type : type,
        data : data
    })
}

server = require('http').createServer(app);
io = require('socket.io')(server);

server.listen(3000);

app.get('/', function(req, res) {
    res.sendFile('views/index.html', {
        root: __dirname
    });
});

app.post('/start', function(req, res) {
    if (inactive) {
        inactive = false;
        ros = fork(path.join(__dirname, "ros.js"));

        ros.on("message", function(msg){

            if(msg.type == 'kill'){
                inactive = true;
            }

            io.sockets.emit(msg.type, msg.data);
        })

        res.send();

    } else {
        res.send("already started");
    }
})

app.post('/kill', function(req, res) {
    if (inactive) {
        res.send('inactive');
        io.sockets.emit("kill", "kill denied")
    } else {
        res.send('requested termination');
        send('kill');
    }
});

app.post('/active', function(req, res) {
    res.send(!inactive);
});

process.on("exit", function() {
    if (!inactive) {
        send('kill');
    }
});
