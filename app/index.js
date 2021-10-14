"use strict";
exports.__esModule = true;
var https = require("https");
var express = require("express");
var ffmpeg_stream_1 = require("ffmpeg-stream");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
var KASA_USERNAME = process.env.KASA_USERNAME;
var KASA_PASSWORD = process.env.KASA_PASSWORD;
var SPOT_IP = process.env.SPOT_IP;
// curl -vv -k -u 'tom.bastianello@gmail.com:VmVyemFAMTk1Nw==' --ignore-content-length "https://192.168.100.20:19443/https/stream/mixed?video=h264&audio=g711&resolution=hd" --output - | ffmpeg -y -i - test.mp4
var app = express();
app.get('/video', function (req, resp) {
    var streamReq = https.request({
        host: SPOT_IP,
        method: "GET",
        path: "/https/stream/mixed?video=h264&audio=g711&resolution=hd",
        port: 19443,
        headers: {
            "Authorization": "Basic " + Buffer.from(KASA_USERNAME + ":" + Buffer.from(KASA_PASSWORD).toString("base64")).toString("base64")
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
                console.log("Stream ended.");
                converter.kill();
                streamReq.destroy();
            }, 1000);
        });
    });
    streamReq.end();
});
app.get("/stream", function (req, res) {
    res.send("\n    <html>\n        <body>\n            <video id=\"videoPlayer\" controls>\n                <source src=\"http://localhost:8080/video\">\n            </video>\n        </body>\n    </html>\n    ");
});
app.listen(8080);
