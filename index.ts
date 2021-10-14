import * as https from "https";
import * as express from "express";
import { Converter } from "ffmpeg-stream";

console.log("Staring Kasa Spot streamer...");

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const KASA_USERNAME: string = process.env.KASA_USERNAME;
const KASA_PASSWORD: string = process.env.KASA_PASSWORD;
const SPOT_IP: string = process.env.SPOT_IP;

if(!(KASA_USERNAME && KASA_PASSWORD && SPOT_IP)) {
    throw new Error("You must provide the following environment variables: KASA_USERNAME, KASA_PASSWORD, SPOT_IP");
}

let app = express();

app.get('/video', function (req, resp) {
    let streamReq = https.request({
        host: SPOT_IP,
        method: "GET",
        path: "/https/stream/mixed?video=h264&audio=g711&resolution=hd",
        port: 19443,
        headers: {
            "Authorization": `Basic ${Buffer.from(`${KASA_USERNAME}:${Buffer.from(KASA_PASSWORD).toString("base64")}`).toString("base64")}`
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
                console.log("Stream ended.");
                converter.kill();
                streamReq.destroy();
            }, 1000);
        });
    });
    streamReq.end();
});

console.log("Listening on port 8080");
app.listen(8080);