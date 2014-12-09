var socket = io.connect(location.protocol + "//" + location.host);

var busy = function() {
    $("#start").css("opacity", 0.5);
    $("#kill").css("opacity", 1);
}

var free = function() {
    $("#start").css("opacity", 1);
    $("#kill").css("opacity", 0.5);
}

socket.on('update', function(data) {
    busy();
    var screenpath = location.protocol + "//" +
        location.host + "/rviz_bin/" + data;
    $("#map").css('background-image', "url("
        + screenpath + ")");
});

socket.on('finish', function(data) {
    $("#status").text(data);
    free();
});

socket.on('kill', function(data) {
    $("#status").text(data);
    free();
});

socket.on('error', function(data) {
    $("#status").text(data);
});

socket.on('load', function(data) {
    $("#status").text(data);
    busy();
});

$(document).ready(function() {
    $("#start").on('click', function() {
        $.post('/start', function(err) {
            if (err) {
                return console.error(err);
            }

            busy();

        });
    });

    $("#kill").on('click', function() {
        $.post('/kill', function(err) {
            free();
        });
    });
});
