import * as https from "https";
import * as express from "express";
import { Converter } from "ffmpeg-stream";
import { readFileSync, rmSync } from "fs";
import { exec } from "child_process";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const KASA_USERNAME: string = process.env.KASA_USERNAME;
const KASA_PASSWORD: string = process.env.KASA_PASSWORD;
const SPOT_IP: string = process.env.SPOT_IP;

const KASA_AUTH_HEADER = `Basic ${Buffer.from(`${KASA_USERNAME}:${Buffer.from(KASA_PASSWORD).toString("base64")}`).toString("base64")}`;

if (!(KASA_USERNAME && KASA_PASSWORD && SPOT_IP)) {
    throw new Error("You must provide the following environment variables: KASA_USERNAME, KASA_PASSWORD, SPOT_IP");
}

let app = express();

let streamRunning = false;
const getScreenshot = () => {
    if(!streamRunning) {
        try {
            rmSync("thumb.jpg")
        }catch (err) {
            console.log("Skipping thumbnail as stream is in progress.");
        }
        console.log("Capturing thumbnail...");
        exec("ffmpeg -i http://localhost:8080/video -ss 00:00:01.500 -f image2 -vframes 1 thumb.jpg").on("close", () => {
            console.log("Thumbnail captured.");
        });
    }
    setTimeout(() => {
        getScreenshot();
    }, 60 * 1000);
}
app.get('/video', function (req, resp) {
    streamRunning = true;
    let streamReq = https.request({
        host: SPOT_IP,
        method: "GET",
        path: "/https/stream/mixed?video=h264&audio=g711&resolution=hd",
        port: 19443,
        headers: {
            "Authorization": KASA_AUTH_HEADER
        }
    }, (res) => {
        const converter = new Converter();
        const input = converter.createInputStream({
            f: "h264",
            framerate: 15
        });
        const output = converter.createOutputStream({
            f: "flv",
            vcodec: "copy",
            preset: "veryfast"
        });

        res.pipe(input);
        output.pipe(resp);

        console.log(`Connected to Spot Camera at ${SPOT_IP}, forwarding stream to ffmpeg...`);
        console.log("Streaming to client.");
        converter.run();

        let timeout;
        res.on("data", () => {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                console.log("Stream timeout.");
                converter.kill();
                streamReq.destroy();
            }, 1000);
        });
        req.on("close", () => {
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
    resp.header("Content-Type", "image/jpeg").send(readFileSync("./thumb.jpg"));
});

app.listen(8080);
console.log("Listening on port 8080");
getScreenshot();