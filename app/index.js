"use strict";
exports.__esModule = true;
var https = require("https");
var express = require("express");
var ffmpeg_stream_1 = require("ffmpeg-stream");
var fs_1 = require("fs");
var child_process_1 = require("child_process");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
var KASA_USERNAME = process.env.KASA_USERNAME;
var KASA_PASSWORD = process.env.KASA_PASSWORD;
var SPOT_IP = process.env.SPOT_IP;
var KASA_AUTH_HEADER = "Basic " + Buffer.from(KASA_USERNAME + ":" + Buffer.from(KASA_PASSWORD).toString("base64")).toString("base64");
if (!(KASA_USERNAME && KASA_PASSWORD && SPOT_IP)) {
    throw new Error("You must provide the following environment variables: KASA_USERNAME, KASA_PASSWORD, SPOT_IP");
}
var app = express();
var streamRunning = false;
var getScreenshot = function () {
    if (!streamRunning) {
        try {
            (0, fs_1.rmSync)("thumb.jpg");
        }
        catch (err) {
            console.log("Skipping thumbnail as stream is in progress.");
        }
        console.log("Capturing thumbnail...");
        (0, child_process_1.exec)("ffmpeg -i http://localhost:8080/video -ss 00:00:01.500 -f image2 -vframes 1 thumb.jpg").on("close", function () {
            console.log("Thumbnail captured.");
        });
    }
    setTimeout(function () {
        getScreenshot();
    }, 60 * 1000);
};
app.get('/video', function (req, resp) {
    streamRunning = true;
    var streamReq = https.request({
        host: SPOT_IP,
        method: "GET",
        path: "/https/stream/mixed?video=h264&audio=g711&resolution=hd",
        port: 19443,
        headers: {
            "Authorization": KASA_AUTH_HEADER
        }
    }, function (res) {
        var converter = new ffmpeg_stream_1.Converter();
        var input = converter.createInputStream({
            f: "h264",
            framerate: 15
        });
        var output = converter.createOutputStream({
            f: "flv",
            vcodec: "copy",
            preset: "veryfast"
        });
        res.pipe(input);
        output.pipe(resp);
        console.log("Connected to Spot Camera at " + SPOT_IP + ", forwarding stream to ffmpeg...");
        console.log("Streaming to client.");
        converter.run();
        var timeout;
        res.on("data", function () {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(function () {
                console.log("Stream timeout.");
                converter.kill();
                streamReq.destroy();
            }, 1000);
        });
        req.on("close", function () {
            console.log("Client has closed the remote connection (close).");
            console.log("Stream ended.");
            converter.kill();
            streamReq.destroy();
            streamRunning = false;
        });
    });
    streamReq.end();
});
app.get('/thumbnail', function (req, resp) {
    resp.header("Content-Type", "image/jpeg").send((0, fs_1.readFileSync)("./thumb.jpg"));
});
app.listen(8080);
console.log("Listening on port 8080");
getScreenshot();
