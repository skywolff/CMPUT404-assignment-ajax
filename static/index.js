var canvas = document.getElementById('c');
var host = window.location.host;
var context = canvas.getContext("2d");
var W = canvas.width  = window.innerWidth-6;
var H = canvas.height = window.innerHeight-50;


function sendRequest(endpoint, objects, callback) {
    // var body = null;
    // if (objects)
    //     body = JSON.stringify(objects);
    fetch(endpoint, {
        method: "POST",
        headers:{
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(objects)
    })
    .then(response => response.json())
    .then(json => {
        if(callback)
            callback(json);
    })
    .catch(e => console.log('Error: ' + e))
}


world = {};

//XXX: TODO Make this prettier!
function drawCircle(context,entity) {
    with(context) {
        beginPath();
        lineWidth = 3;
        var x = entity["x"];
        var y = entity["y"];
        //moveTo(x,y);
        fillStyle = entity["colour"];
        strokeStyle = fillStyle;
        arc(x, y, (entity["radius"])?entity["radius"]:50, 0, 2.0 * Math.PI, false);
        stroke();
    }
}

function prepEntity(entity) {
    if (!entity["colour"]) {
        entity["colour"] = "#FF0000";
    }
    if (!entity["radius"]) {
        entity["radius"] = 50;
    }
    return entity;
}

function clearFrame() {
    with(context) {
    moveTo(0,0);
    fillStyle = "#000";
    fillRect(0,0,W,H);
    }

}

// This actually draws the frame
function renderFrame() {
    clearFrame();
    for (var key in world) {
        var entity = world[key];
        drawCircle(context,prepEntity(entity));
    }
}

var drawNext = true;

// Signals that there's something to be drawn
function drawNextFrame() {
    drawNext = true;
}

// This optionally draws the frame, call this if you're not sure if you should update
// the canvas
function drawFrame() {
    if (drawNext) {
        renderFrame();
        drawNext = false;
    }
}

// This is unpleasent, canvas clicks are not handled well
// So use this code, it works well on multitouch devices as well.
function getPosition(e) {
    if ( e.targetTouches && e.targetTouches.length > 0) {
        var touch = e.targetTouches[0];
        var x = touch.pageX  - canvas.offsetLeft;
        var y = touch.pageY  - canvas.offsetTop;
        return [x,y];
    } else {
        var rect = e.target.getBoundingClientRect();
        var x = e.offsetX || e.pageX - rect.left - window.scrollX;
        var y = e.offsetY || e.pageY - rect.top  - window.scrollY;
        var x = e.pageX  - canvas.offsetLeft;
        var y = e.pageY  - canvas.offsetTop;
        return [x,y];
    }
}


function addEntity(entity, data) {
    world[entity] = data;
    drawNextFrame();
    sendRequest('/entity/' + entity, data, null);
}

var counter = 0;
function addEntityWithoutName(data) {
    //var name = "X"+Math.floor((Math.random()*100)+1);
    var name = "X"+(counter++)%100;
    addEntity(name,data);
}

// canvas + mouse/touch is complicated
// I give you this because well the mouse/touch stuff is a total
// pain to get right. This has some out of context bug too.
mouse = (function() {
    // Now this isn't the most popular way of doing OO in
    // Javascript, but it relies on lexical scope and I like it
    // This isn't 301 so I'm not totally bound to OO :)
    var self;
    self = {
        clicked: 0,
        // these are listener lists append to them
        mousemovers: [],
        mousedraggers: [],
        mousedowners: [],
        mouseuppers: [],
        callListeners: function(listeners,x,y,clicked,e) {
            for (i in listeners) {
                listeners[i](x,y,clicked,e);
            }
        },
        wasClicked: function(e) {
            var pos = getPosition(e);
            var x = pos[0];
            var y = pos[1];
            if (x >= 0 && x <= W && y >= 0 && y <= H) {
                return 1;
            } else {
                return 0;
            }
        },
        mousedown: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            self.clicked = 1;
                self.callListeners(self.mousedowners,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'red'});
            }
        },
        mouseup: function(e) {
            e.preventDefault();
            //alert(getPosition(e));
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            //self.poppin(x,y);
            self.clicked = 0;
                self.selected = -1;
                self.callListeners(self.mouseuppers,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
            }
        },
        touchstart: function(e) {
            self.lasttouch = e;
            return self.mousedown(e);
        },
    touchend: function(e) {
            var touch = (self.lasttouch)?self.lasttouch:e;
            return self.mouseup(touch);
    },
    mousemove: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
            if (self.clicked != 0) {
                //self.squeakin(x,y);
                    self.callListeners(self.mousedraggers,x,y,self.clicked,e);
            }
                self.callListeners(self.mousemovers,x,y,self.clicked,e);
            }
    },
    touchmove: function(e) {
            self.lasttouch = e;
            return self.mousemove(e);
    },
    // Install the mouse listeners
    mouseinstall: function() {
            canvas.addEventListener("mousedown",  self.mousedown, false);
            canvas.addEventListener("mousemove",  self.mousemove, false);
            canvas.addEventListener("mouseup",    self.mouseup, false);
            canvas.addEventListener("mouseout",   self.mouseout, false);
            canvas.addEventListener("touchstart", self.touchstart, false);
            canvas.addEventListener("touchmove",  self.touchmove, false);
            canvas.addEventListener("touchend",   self.touchend, false);
    }
    };
    // Force install!
    self.mouseinstall();
    return self;
})();

// Add the application specific mouse listeners!
//XXX: TODO Make these prettier!
mouse.mousedowners.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
});

mouse.mouseuppers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':'red'});
});

mouse.mousedraggers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x,'y':y,'colour':'green',
                          'radius':10});
});


function update() {
    // get the world then update the frame
    sendRequest('/world', null, newWorld => {
        if (world !== newWorld) {
            world = newWorld;
            drawNextFrame();
        }
    });
    drawFrame();
}

// 30 frames per second
setInterval(update, 1000/30.0);
// setInterval(update, 1000/1.0);
