var socket = io.connect(location.protocol + "//" + location.host);

var busy = function() {
    $("#start").css("opacity", 0.5).css("cursor", "auto");
    $("#kill").css("opacity", 1).css("cursor", "pointer");
}

var free = function() {
    $("#start").css("opacity", 1).css("cursor", "pointer");
    $("#kill").css("opacity", 0.5).css("cursor", "auto");
}

var frames = [];

var disabled = function(e){
    return $(e).css("opacity") == 0.5;
}

var blur = function(e, a){
    $(e).css({
       'filter'         : 'blur(' + a + ')',
       '-webkit-filter' : 'blur(' + a + ')',
       '-moz-filter'    : 'blur(' + a + ')',
       '-o-filter'      : 'blur(' + a + ')',
       '-ms-filter'     : 'blur(' + a + ')'
    });
}

$(document).ready(function() {

    busy();

    $("#console").hide();

    $("#start").on('click', function() {
        if(disabled(this)) return;
        $.post('/start', function(err) {
            if (err) {
                return console.error(err);
            }

            busy();

        });
    });

    $(".nicescroll").niceScroll({
        cursorborder : "none",
        cursorcolor : "rgba(255,255,255,0.3)"
    });

    $("#kill").on('click', function() {
        if(disabled(this)) return;
        $.post('/kill');
    });

    $("#togg-console").on('click', function() {
        $("#console").fadeToggle();
    });

    $.post("/active", function(data){
        if(data.toString() == "true") busy();
        else {
            $("#console").text("System ready and awaiting your command...\n");
            free();
        }
        connect();
    });
});

function connect(){
    socket.on('update', function(data) {
        busy();
        var screenpath = location.protocol + "//" +
            location.host + "/rviz_bin/" + data;
        frames.push($("<div/>").css('background-image', "url("+ screenpath + ")")
                   .addClass('map')
                   .hide()
                   .appendTo('#right')
                   .fadeIn(3000));
        if(frames.length > 3){
            $(frames[0]).remove();
            frames.splice(0, 1);
        }
    });

    var lastTimeout = 0;
    var status = function(data){
        $("#status").text(data).addClass("highlight");
        clearTimeout(lastTimeout);
        lastTimeout = setTimeout(function(){
            $("#status").removeClass("highlight");
        }, 400);
    }

    socket.on('finish', function(data) {
        status(data);
        free();
    });

    socket.on('kill', function(data) {
        status(data);
        free();
    });

    socket.on('error', function(data) {
        status(data);
    });

    socket.on('info', function(data) {
        status(data);
    });

    socket.on('load', function(data) {
        status(data);
        busy();
    });

    var $console = $("#console");

    socket.on("cout", function(data){
        $console.append($("<code>" +  data + "</code>"));
    });
    socket.on("cerr", function(data){
        $console.append($("<code class ='err'>" + data + "</code>"));
    });
}
