## TP-Link Kasa Spot Stream
This docker image is intended to allow streaming of Kasa Spot KC100 (should work with other models) to any streaming capable application such as VLC and home assistant.

## Warning
This project is still very "alpha" so please expect things to break. Contributions are welcome, this is just a side project for fun, but could be really useful.

At the moment this has been tested as working with the KC100, Home Assistant and VLC.

## Deployment
Running this application only requires 3 environment variables:
- `KASA_USERNAME`: Your TP-Link Kasa username.
- `KASA_PASSWORD`: Your TP-Link Kasa password.
- `SPOT_IP`: The local network IP address of your Spot Camera.

## Home Assistant Configuration
Home assistant can be pointed at this docker image adding the following lines to your configuration file (replace anything between <>):
```yaml
camera:
  - platform: generic
    name: <Camera Name>
    verify_ssl: false
    still_image_url: http://<IP Address or DNS name of the kasa-spot-stream docker container>:<Port, default is 8080>/thumbnail
    stream_source: http://<IP Address or DNS name of the kasa-spot-stream docker container>:<Port, default is 8080>/video
```
Save the configuration and restart home assistant, the camera should now show up in your list of entities.

## To-Do
There is lots to do still, but here are the top 4:
- I don't like the thumbnail implementation so that could be improved for sure.
- Add quality of life improvements to improve stability, there are lots of "crashy" scenarios at the moment.
- Test integration with Frigate.
- Improve issues with stream delay (I'll have to see if this is a limitation of the camera itself).