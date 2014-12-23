var express = require('express');
var morgan = require('morgan');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var fork = require('child_process').fork;
var mkdirp = require('mkdirp');
var fs = require('fs');

// Prep the app
var app = express();

app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({
        extended: false
    }));
app.use(bodyParser.json())
app.use(methodOverride());

// sockets
var server = require('http').createServer(app);
var io = require('socket.io')(server);

server.listen(3000);

// activity
var inactive = true, ros;
var send = function(type, data){
    ros.send({
        type : type,
        data : data
    })
};

app.get('/', function(req, res) {
    res.sendFile('views/index.html', {
        root: __dirname
    });
});

var rmrfdirSync = function(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

app.post('/start', function(req, res) {
    if (inactive) {
        inactive = false;

        var type = req.param("type");

        switch(type){
            case "single-agent-mapping" :
                ros = fork(path.join(__dirname, "ros/single-agent-mapping.js"));
                break;
            default:
                type = "multi-agent-mapping";
            case "multi-agent-mapping":
                ros = fork(path.join(__dirname, "ros/multi-agent-mapping.js"));
                break;
        }

        ros.type = type;
        ros.on("message", function(msg){
            if(msg.type == 'kill-end'){
                var rviz_bin = path.join(__dirname, "/public/rviz_bin");

                try {
                    rmrfdirSync(rviz_bin);
                } catch(e){
                    console.error(e);
                }
                try {
                    mkdirp.sync(rviz_bin);
                } catch(e){
                    console.error(e);
                }

                inactive = true;
            }

            io.sockets.emit(msg.type, {
                "type" : ros.type,
                "msg" : msg.data
            });
        });

        res.send();

    } else {
        res.send("ros instance already started");
    }
})

app.post('/kill', function(req, res) {
    if (inactive) {
        res.send('session in active');
    } else {
        var type = req.param("type");
        if(ros.type === type){
            send('kill');
            res.send();
        } else {
            res.send('type not valid - ' + type);
        }
    }
});

app.post('/active', function(req, res) {
    res.send({
        "active" : !inactive,
        "type" : inactive ? "" : ros.type
    });
});

process.on("exit", function() {
    if (!inactive) {
        send('kill');
    }
});
