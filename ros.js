var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var child_handles = [];
var SCREENSHOT_OUTPUT_PATH = "/home/mkurian/catkin_ws/src/bwi_nodejs_client/public/rviz_bin";
var ros_pid, rviz_pid, alive = true;

Date.MIN_VALUE = new Date(-8640000000000000);

var exec = function() {
    var cp = child_process.exec.apply(child_process, arguments);
    child_handles.push(cp);
    return cp;
}

var kill = function() {
    if (alive) {
        alive = false;

        exec("kill " + ros_pid, function(err, stdout, stderr) {
            exec("kill " + rviz_pid, function(err, stdout, stderr) {

                child_handles.forEach(function(child_process) {
                    console.log("killed " + child_process.pid);
                    child_process.kill('SIGINT');
                });

                send("kill", "process terminated. flushed proceses");

                return process.exit(0);
            });
        });
    }
}

var getLastModifiedFile = function(dir) {
    var filename;
    var date = Date.MIN_VALUE;
    fs.readdirSync(dir).forEach(function(file) {
        var mdate = fs.statSync(path.join(dir, file)).mtime;
        if (mdate > date) {
            filename = file;
            date = mdate
        }
    });
    return filename;
}

var send = function(type, data) {
    process.send({
        type: type,
        data: data
    });
}

exec("roslaunch bwi_nav2d nav2d_mapper_krr2014.launch");

send("load", "waiting on roslaunch");

setTimeout(function() {
    exec("/usr/bin/pgrep roslaunch", function(err, stdout, stderr) {
        if (err) {
            return send("fail", "failed to find ros_pid");
        }

        ros_pid = stdout;

        process.on('message', function(data) {
            switch (data.type) {
                case "kill":
                    return kill();
            }
        })

        setTimeout(function() {
            exec("pidof rviz", function(err, stdout, stderr) {
                rviz_pid = stdout;
                send("load", "init mapping");
                exec("rosservice call /StartMapping 3", function(err, stdout, stderr) {
                    if (err) {
                        return console.error(err);
                    }
                    send("load", "init mapping");
                    setTimeout(function() {
                        console.log("starting exploration");
                        send("load", "init exploration");
                        exec("rosservice call /StartExploration 2", function() {
                            if (err) {
                                return console.error(err);
                            }
                            var start = Date.now();
                            var lastscreen;
                            var robot = function() {
                                console.log("taking screenshot");
                                exec("kill -10 " + rviz_pid, function(err, stdout, stderr) {
                                    setTimeout(function() {
                                        try {
                                            if (lastscreen) {
                                                fs.unlinkSync(lastscreen);
                                            }
                                            var file = getLastModifiedFile(SCREENSHOT_OUTPUT_PATH);
                                            var currscreen = path.join(SCREENSHOT_OUTPUT_PATH, file);
                                            lastscreen = currscreen;
                                            send("update", file);
                                        } catch (e) {
                                            console.error(e);
                                            send("error", e.message);
                                        }
                                        setTimeout(robot, 2000);
                                    }, 2000);
                                });
                            };
                            robot();
                        });
                    }, 10000);
                });
            });
        }, 10000);
    });
}, 2000);
