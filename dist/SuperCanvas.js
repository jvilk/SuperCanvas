var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Point = (function () {
    function Point(x, y) {
        if (typeof x === "undefined") { x = 0; }
        if (typeof y === "undefined") { y = 0; }
        this.x = x;
        this.y = y;
    }
    return Point;
})();
var Rectangle = (function () {
    function Rectangle(start, end) {
        this.start = start;
        this.end = end;
    }
    return Rectangle;
})();

// Wraps a HTMLCanvasElement for the SuperCanvas.
var CanvasWrap = (function (_super) {
    __extends(CanvasWrap, _super);
    function CanvasWrap(canvas) {
        // ASSUMPTION: All canvases are children of <body>, and thus offsetLeft/
        // offsetTop represents its offset relative to the page.
        //var start = new Point(canvas.offsetLeft, canvas.offsetTop);
        //var end = new Point(canvas.offsetLeft + canvas.width, canvas.offsetTop + canvas.height);
        var rect = canvas.getBoundingClientRect();
        var start = new Point(rect.left, rect.top);
        var end = new Point(rect.right, rect.bottom);
        _super.call(this, start, end);
        this.canvas = canvas;
    }
    return CanvasWrap;
})(Rectangle);

// Wraps one canvas's context, and proxies updates to all other specified
// contexts.
var Wrap2DContext = (function () {
    function Wrap2DContext(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.updateScheduled = false;
        var that = this;
        for (var prop in ctx) {
            if (typeof this[prop] !== 'undefined') {
                continue;
            }

            // Create a closure to capture 'prop'.
            (function (prop) {
                if (typeof ctx[prop] === 'function') {
                    that[prop] = function () {
                        // Proxy the function call.
                        var rv = that.ctx[prop].apply(that.ctx, arguments);

                        // Update the super canvas.
                        that.scheduleUpdate();
                        return rv;
                    };
                } else {
                    Object.defineProperty(that, prop, {
                        set: function (val) {
                            // Proxy the property update.
                            that.ctx[prop] = val;

                            // Update the super canvas.
                            that.scheduleUpdate();
                        },
                        get: function () {
                            // No need to wrap.
                            return that.ctx[prop];
                        }
                    });
                }
            })(prop);
        }
    }
    Wrap2DContext.prototype.scheduleUpdate = function () {
        if (this.updateScheduled) {
            return;
        }
        this.updateScheduled = true;
        var that = this;
        setTimeout(function () {
            that.canvas.update();
            that.updateScheduled = false;
        }, 0);
    };
    return Wrap2DContext;
})();

var SuperCanvas = (function (_super) {
    __extends(SuperCanvas, _super);
    function SuperCanvas(canvases) {
        _super.call(this, new Point(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY), new Point(0, 0));
        this.canvases = [];

        for (var i = 0; i < canvases.length; i++) {
            this.canvases.push(new CanvasWrap(canvases[i]));
            var canvas = this.canvases[i];
            if (canvas.start.x < this.start.x) {
                this.start.x = canvas.start.x;
            }
            if (canvas.end.x > this.end.x) {
                this.end.x = canvas.end.x;
            }
            if (canvas.start.y < this.start.y) {
                this.start.y = canvas.start.y;
            }
            if (canvas.end.y > this.end.y) {
                this.end.y = canvas.end.y;
            }
        }
        this.width = this.end.x - this.start.x;
        this.height = this.end.y - this.start.y;

        // Create a backing canvas that will receive all drawing commands.
        this.buffer = document.createElement('canvas');
        this.buffer.width = this.width;
        this.buffer.height = this.height;
        this.ctx = new Wrap2DContext(this.buffer.getContext('2d'), this);

        var that = this;

        for (var prop in this.buffer) {
            if (typeof this[prop] !== 'undefined') {
                continue;
            }

            // Create a closure to capture prop.
            (function (prop) {
                if (typeof that.buffer[prop] === 'function') {
                    that[prop] = function () {
                        return that.buffer[prop].apply(that.buffer, arguments);
                    };
                } else {
                    Object.defineProperty(that, prop, {
                        get: function () {
                            return that.buffer[prop];
                        },
                        set: function (val) {
                            that.buffer[prop] = val;
                        }
                    });
                }
            })(prop);
        }
    }
    SuperCanvas.prototype.toDataURL = function (type) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            args[_i] = arguments[_i + 1];
        }
        return this.buffer.toDataURL(type, args);
    };

    SuperCanvas.prototype.getContext = function (contextId) {
        var args = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            args[_i] = arguments[_i + 1];
        }
        if (contextId !== "2d") {
            throw new Error("Invalid context specified.");
        }

        // ctx upholds the CanvasRenderingContext2D type.
        return this.ctx;
    };

    // Updates all of the individual canvases that comprise the SuperCanvas.
    // Should only be called by Wrap2DContext.
    SuperCanvas.prototype.update = function () {
        for (var i = 0; i < this.canvases.length; i++) {
            var wc = this.canvases[i];
            var ctx = wc.canvas.getContext('2d');
            var offsetX = wc.start.x - this.start.x;
            var offsetY = wc.start.y - this.start.y;

            // Translate the coordinates to ones local to this particular canvas.
            ctx.clearRect(0, 0, wc.canvas.width, wc.canvas.height);
            ctx.drawImage(this.buffer, offsetX, offsetY, wc.canvas.width, wc.canvas.height, 0, 0, wc.canvas.width, wc.canvas.height);
        }
    };

    SuperCanvas.prototype.msToBlob = function () {
        return this.buffer.msToBlob();
    };
    return SuperCanvas;
})(Rectangle);
