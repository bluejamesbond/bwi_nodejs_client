var socket = io.connect(location.protocol + "//" + location.host);
// var socket = io.connect("http://localhost:3000");

var disabled = function(e) {
    return $(e).css("opacity") == 0.5;
}

var frames = [];

var busy = function(p) {
    p = typeof p === "undefined" ? "" : p;
    $(p + ".start").css("opacity", 0.5).css("cursor", "auto");
    $(p + ".kill").css("opacity", 1).css("cursor", "pointer");
}

var free = function(p) {
    p = typeof p === "undefined" ? "" : p;
    $(p + ".start").css("opacity", 1).css("cursor", "pointer");
    $(p + ".kill").css("opacity", 0.5).css("cursor", "auto");
}

var showPopup = function(){
    $(".popup, .blanket").fadeIn();
}

var hidePopup = function(){
    $(".popup, .blanket").fadeOut();
}

$(document).ready(function() {

    busy();

    var group = $(".SlidingPanelsContentGroup");
    var length = group.children().length;

    group.css("width", length * 100 + "%");
    group.addClass("SlidingAnimator");

    $(".SlidingPanelsContent").css("width", 100 / length + "%");

    window.slideTo = function(id) {
        $(".tab").removeClass("tab-selected");
        $(".tab-group").children().eq(parseInt(id)).addClass("tab-selected");
        var attr = "translate3d(" + (-100 / length * id) + "%,0,0)";
        group.css({
            "transform": attr,
            "-webkit-transform": attr,
            "-moz-transform": attr,
            "-ms-transform": attr
        })
    }

    $(".ok, .blanket").click(function(){
        hidePopup();
    });

    $(".console").hide();

    $(".start").on('click', function() {
        if (disabled(this)) return;
        $.post('/start', {
            type : $(this).attr("type")
        }, function(err) {
            if (err) {
                return console.error(err);
            }
            busy();
        });
    });

    $(".nicescroll").niceScroll({
        cursorborder: "none",
        cursorcolor: "rgba(255,255,255,0.3)"
    });

    $(".kill").on('click', function() {
        if (disabled(this)) return;
        $.post('/kill', {
            type : $(this).attr("type")
        });
    });

    $(".togg-console").on('click', function() {
        $("." + $(this).attr("type") + " .console").fadeToggle();
    });

    $.post("/active", function(sys) {
        if (sys.active) {
            free()
            busy(sys.type);
        } else {
            $(".console").text("System ready and awaiting your command...\n");
            free();
        }
        connect();
    });
});

function connect() {
    socket.on('update', function(data) {
        busy();
        var screenpath = location.protocol + "//" +
            location.host + "/rviz_bin/" + data.msg;
        frames.push($("<div/>").css('background-image', "url(" + screenpath + ")")
            .addClass('map')
            .addClass(data.type + "-background")
            .hide()
            .appendTo('.' + data.type + ' .right')
            .fadeIn(3000));
        if (frames.length > 3) {
            $(frames[0]).remove();
            frames.splice(0, 1);
        }
    });

    var lastTimeout = 0;
    var status = function(data) {
        $("." + data.type + " .status").text(data.msg).addClass("highlight");
        clearTimeout(lastTimeout);
        lastTimeout = setTimeout(function() {
            $("." + data.type + " .status").removeClass("highlight");
        }, 400);
    }

    socket.on('finish', function(data) {
        status(data);
        free();
    });

    socket.on('kill-start', function(data) {
        status(data);
    });

    socket.on('kill-end', function(data) {
        status(data);
        free();
    });

    socket.on('error', function(data) {
        status(data);
        showPopup();
    });

    socket.on('info', function(data) {
        status(data);
    });

    socket.on('load', function(data) {
        status(data);
        busy();
    });

    var console = {
        "single-agent-mapping" : $(".single-agent-mapping .console"),
        "multi-agent-mapping" : $(".multi-agent-mapping .console")
    }

    socket.on("cout", function(data) {
        console[data.type].append($("<code>" + data.msg + "</code>"));
    });

    socket.on("cerr", function(data) {
        console[data.type].append($("<code class ='err'>" + data.msg + "</code>"));
    });
}
